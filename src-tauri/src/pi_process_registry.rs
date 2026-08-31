use serde::Serialize;
use std::collections::{HashMap, VecDeque};
use std::sync::{Arc, Mutex};

pub const PRODUCTION_PI_PROCESS_LIMIT: usize = 1;
const MAX_PI_PROCESS_LIMIT: usize = 16;

pub trait RegistryAuthority: Clone {
    fn journey_id(&self) -> &str;
    fn run_id(&self) -> &str;
    fn inspection_identity(&self) -> RegistryAuthorityInspection;
}

#[derive(Clone, Debug, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct RegistryAuthorityInspection {
    pub schema_version: String,
    pub journey_id: String,
    pub run_id: String,
    pub turn_id: String,
    pub thread_id: String,
    pub generation: u64,
    pub pi_session_id: String,
    pub mirror_conversation_id: String,
    pub harness_user_message_id: String,
    pub harness_assistant_message_id: String,
}

#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize)]
#[serde(rename_all = "snake_case")]
pub enum ProcessCapacityState {
    Reserved,
    Running,
    Released,
}

#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize)]
#[serde(rename_all = "snake_case")]
pub enum JourneyLeasePhase {
    Reserved,
    Running,
    Finalizing,
}

#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize)]
#[serde(rename_all = "snake_case")]
pub enum CancellationState {
    None,
    Requested,
}

#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize)]
#[serde(rename_all = "snake_case")]
pub enum TerminalState {
    Open,
    Completed,
    Cancelled,
    SpawnFailed,
    ProcessDied,
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct RunTarget {
    pub journey_id: String,
    pub run_id: String,
}

impl RunTarget {
    pub fn new(journey_id: impl Into<String>, run_id: impl Into<String>) -> Self {
        Self {
            journey_id: journey_id.into(),
            run_id: run_id.into(),
        }
    }
}

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum ReserveError {
    DuplicateJourney,
    CapacityReached,
}

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum TargetError {
    Missing,
    Stale,
    NotRunning,
    NotFinalizing,
}

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum AttachOutcome {
    Attached,
    CancelImmediately,
}

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum CancelOutcome {
    RequestedBeforeAttachment,
    RequestedRunning,
    AlreadyRequested,
}

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum TerminalizeOutcome {
    First,
    Duplicate,
    Stale,
}

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum ReleaseOutcome {
    Released,
    AlreadyReleased,
}

#[derive(Debug, PartialEq, Eq)]
pub enum ReserveThenStartError<E> {
    RegistryUnavailable,
    Reservation(ReserveError),
    Start {
        target: RunTarget,
        error: E,
        first_terminal: bool,
    },
}

#[derive(Debug, PartialEq, Eq)]
pub enum ChildControlError<E> {
    Unavailable,
    Operation(E),
}

pub fn control_child_handle<C, R, E>(
    child: &Arc<Mutex<C>>,
    operation: impl FnOnce(&mut C) -> Result<R, E>,
) -> Result<R, ChildControlError<E>> {
    let mut child = child.lock().map_err(|_| ChildControlError::Unavailable)?;
    operation(&mut child).map_err(ChildControlError::Operation)
}

pub fn join_before_continuation<J>(
    joiners: impl IntoIterator<Item = J>,
    mut join: impl FnMut(J),
    continuation: impl FnOnce(),
) {
    for joiner in joiners {
        join(joiner);
    }
    continuation();
}

#[derive(Clone, Debug, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PiInvocationLeaseInspection {
    pub authority: RegistryAuthorityInspection,
    pub lease_phase: JourneyLeasePhase,
    pub process_capacity_state: ProcessCapacityState,
    pub cancellation_state: CancellationState,
    pub terminal_state: TerminalState,
}

#[derive(Clone, Debug, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PiInvocationRegistryInspection {
    pub schema_version: String,
    pub limit: usize,
    pub process_capacity_in_use: usize,
    pub entries: Vec<PiInvocationLeaseInspection>,
}

struct RegistryEntry<A, C, P> {
    authority: A,
    _provider_snapshot: P,
    child: Option<C>,
    process_capacity_state: ProcessCapacityState,
    lease_phase: JourneyLeasePhase,
    cancellation_state: CancellationState,
    terminal_state: TerminalState,
}

pub struct PiProcessRegistry<A, C, P> {
    limit: usize,
    process_capacity_in_use: usize,
    entries: HashMap<String, RegistryEntry<A, C, P>>,
    released_targets: VecDeque<RunTarget>,
}

pub fn reserve_then_start<A, C, P, F, E>(
    registry: &Arc<Mutex<PiProcessRegistry<A, C, P>>>,
    authority: A,
    provider_snapshot: P,
    start: F,
) -> Result<RunTarget, ReserveThenStartError<E>>
where
    A: RegistryAuthority,
    F: FnOnce(&RunTarget) -> Result<(), E>,
{
    let target = registry
        .lock()
        .map_err(|_| ReserveThenStartError::RegistryUnavailable)?
        .reserve(authority, provider_snapshot)
        .map_err(ReserveThenStartError::Reservation)?;
    if let Err(error) = start(&target) {
        let first_terminal = registry
            .lock()
            .map(|mut registry| {
                registry.terminalize(&target, TerminalState::SpawnFailed)
                    == TerminalizeOutcome::First
            })
            .unwrap_or(false);
        return Err(ReserveThenStartError::Start {
            target,
            error,
            first_terminal,
        });
    }
    Ok(target)
}

impl<A: RegistryAuthority, C, P> PiProcessRegistry<A, C, P> {
    pub fn new(limit: usize) -> Result<Self, String> {
        if limit == 0 || limit > MAX_PI_PROCESS_LIMIT {
            return Err("Pi process registry limit is outside the bounded range.".to_string());
        }
        Ok(Self {
            limit,
            process_capacity_in_use: 0,
            entries: HashMap::new(),
            released_targets: VecDeque::new(),
        })
    }

    pub fn production() -> Self {
        Self::new(PRODUCTION_PI_PROCESS_LIMIT).expect("production Pi process limit must be valid")
    }

    pub fn reserve(
        &mut self,
        authority: A,
        provider_snapshot: P,
    ) -> Result<RunTarget, ReserveError> {
        let journey_id = authority.journey_id().to_string();
        if self.entries.contains_key(&journey_id) {
            return Err(ReserveError::DuplicateJourney);
        }
        if self.entries.len() >= self.limit || self.process_capacity_in_use >= self.limit {
            return Err(ReserveError::CapacityReached);
        }
        let target = RunTarget::new(&journey_id, authority.run_id());
        self.entries.insert(
            journey_id,
            RegistryEntry {
                authority,
                _provider_snapshot: provider_snapshot,
                child: None,
                process_capacity_state: ProcessCapacityState::Reserved,
                lease_phase: JourneyLeasePhase::Reserved,
                cancellation_state: CancellationState::None,
                terminal_state: TerminalState::Open,
            },
        );
        self.process_capacity_in_use += 1;
        Ok(target)
    }

    pub fn attach_child(
        &mut self,
        target: &RunTarget,
        child: C,
    ) -> Result<AttachOutcome, TargetError> {
        let entry = self.matching_entry_mut(target)?;
        if entry.terminal_state != TerminalState::Open
            || entry.lease_phase != JourneyLeasePhase::Reserved
        {
            return Err(TargetError::NotRunning);
        }
        entry.child = Some(child);
        entry.process_capacity_state = ProcessCapacityState::Running;
        entry.lease_phase = JourneyLeasePhase::Running;
        Ok(
            if entry.cancellation_state == CancellationState::Requested {
                AttachOutcome::CancelImmediately
            } else {
                AttachOutcome::Attached
            },
        )
    }

    pub fn request_cancel(&mut self, target: &RunTarget) -> Result<CancelOutcome, TargetError> {
        let entry = self.matching_entry_mut(target)?;
        if entry.terminal_state != TerminalState::Open
            || entry.lease_phase == JourneyLeasePhase::Finalizing
        {
            return Err(TargetError::NotRunning);
        }
        if entry.cancellation_state == CancellationState::Requested {
            return Ok(CancelOutcome::AlreadyRequested);
        }
        entry.cancellation_state = CancellationState::Requested;
        Ok(if entry.child.is_some() {
            CancelOutcome::RequestedRunning
        } else {
            CancelOutcome::RequestedBeforeAttachment
        })
    }

    pub fn child_handle(&self, target: &RunTarget) -> Result<C, TargetError>
    where
        C: Clone,
    {
        let entry = self.matching_entry(target)?;
        if entry.terminal_state != TerminalState::Open
            || entry.lease_phase != JourneyLeasePhase::Running
        {
            return Err(TargetError::NotRunning);
        }
        entry.child.clone().ok_or(TargetError::NotRunning)
    }

    pub fn cancellation_requested(&self, target: &RunTarget) -> Result<bool, TargetError> {
        Ok(self.matching_entry(target)?.cancellation_state == CancellationState::Requested)
    }

    pub fn terminalize(
        &mut self,
        target: &RunTarget,
        terminal: TerminalState,
    ) -> TerminalizeOutcome {
        if terminal == TerminalState::Open {
            return TerminalizeOutcome::Duplicate;
        }
        let Some(entry) = self.entries.get_mut(&target.journey_id) else {
            return TerminalizeOutcome::Stale;
        };
        if entry.authority.run_id() != target.run_id {
            return TerminalizeOutcome::Stale;
        }
        if entry.terminal_state != TerminalState::Open {
            return TerminalizeOutcome::Duplicate;
        }
        if entry.process_capacity_state != ProcessCapacityState::Released {
            self.process_capacity_in_use = self.process_capacity_in_use.saturating_sub(1);
        }
        entry.child = None;
        entry.process_capacity_state = ProcessCapacityState::Released;
        entry.lease_phase = JourneyLeasePhase::Finalizing;
        entry.terminal_state = terminal;
        TerminalizeOutcome::First
    }

    pub fn release_lease(&mut self, target: &RunTarget) -> Result<ReleaseOutcome, TargetError> {
        let Some(entry) = self.entries.get(&target.journey_id) else {
            return if self
                .released_targets
                .iter()
                .any(|released| released == target)
            {
                Ok(ReleaseOutcome::AlreadyReleased)
            } else {
                Err(TargetError::Missing)
            };
        };
        if entry.authority.run_id() != target.run_id {
            return Err(TargetError::Stale);
        }
        if entry.lease_phase != JourneyLeasePhase::Finalizing
            || entry.process_capacity_state != ProcessCapacityState::Released
        {
            return Err(TargetError::NotFinalizing);
        }
        self.entries.remove(&target.journey_id);
        self.released_targets.push_back(target.clone());
        while self.released_targets.len() > self.limit.saturating_mul(2) {
            self.released_targets.pop_front();
        }
        Ok(ReleaseOutcome::Released)
    }

    pub fn inspect(&self) -> PiInvocationRegistryInspection {
        let mut entries = self
            .entries
            .values()
            .map(|entry| PiInvocationLeaseInspection {
                authority: entry.authority.inspection_identity(),
                lease_phase: entry.lease_phase,
                process_capacity_state: entry.process_capacity_state,
                cancellation_state: entry.cancellation_state,
                terminal_state: entry.terminal_state,
            })
            .collect::<Vec<_>>();
        entries.sort_by(|left, right| left.authority.journey_id.cmp(&right.authority.journey_id));
        entries.truncate(self.limit);
        PiInvocationRegistryInspection {
            schema_version: "0.1.0".to_string(),
            limit: self.limit,
            process_capacity_in_use: self.process_capacity_in_use,
            entries,
        }
    }

    fn matching_entry(&self, target: &RunTarget) -> Result<&RegistryEntry<A, C, P>, TargetError> {
        let entry = self
            .entries
            .get(&target.journey_id)
            .ok_or(TargetError::Missing)?;
        if entry.authority.run_id() != target.run_id {
            return Err(TargetError::Stale);
        }
        Ok(entry)
    }

    fn matching_entry_mut(
        &mut self,
        target: &RunTarget,
    ) -> Result<&mut RegistryEntry<A, C, P>, TargetError> {
        let entry = self
            .entries
            .get_mut(&target.journey_id)
            .ok_or(TargetError::Missing)?;
        if entry.authority.run_id() != target.run_id {
            return Err(TargetError::Stale);
        }
        Ok(entry)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::to_value;
    use std::sync::{
        atomic::{AtomicUsize, Ordering},
        Arc, Barrier, Mutex,
    };
    use std::thread;

    #[derive(Clone, Debug, PartialEq, Eq)]
    struct FakeAuthority {
        journey_id: String,
        run_id: String,
        private_session_file: String,
    }

    impl RegistryAuthority for FakeAuthority {
        fn journey_id(&self) -> &str {
            &self.journey_id
        }
        fn run_id(&self) -> &str {
            &self.run_id
        }
        fn inspection_identity(&self) -> RegistryAuthorityInspection {
            RegistryAuthorityInspection {
                schema_version: "0.1.0".into(),
                journey_id: self.journey_id.clone(),
                run_id: self.run_id.clone(),
                turn_id: format!("turn-{}", self.run_id),
                thread_id: format!("thread-{}", self.journey_id),
                generation: 1,
                pi_session_id: format!("pi-{}", self.journey_id),
                mirror_conversation_id: format!("mirror-{}", self.journey_id),
                harness_user_message_id: format!("user-{}", self.run_id),
                harness_assistant_message_id: format!("assistant-{}", self.run_id),
            }
        }
    }

    #[derive(Debug, Default)]
    struct FakeChildState {
        kills: usize,
        waits: usize,
    }

    #[derive(Clone, Debug, Default)]
    struct FakeChild {
        state: Arc<Mutex<FakeChildState>>,
    }

    #[allow(dead_code)]
    #[derive(Clone, Debug)]
    struct FakeProvider {
        secret: String,
    }

    fn authority(journey: &str, run: &str) -> FakeAuthority {
        FakeAuthority {
            journey_id: journey.into(),
            run_id: run.into(),
            private_session_file: format!("/private/{journey}/{run}.jsonl"),
        }
    }

    #[test]
    fn production_limit_is_exactly_one_and_invalid_limits_fail() {
        assert_eq!(PRODUCTION_PI_PROCESS_LIMIT, 1);
        assert!(PiProcessRegistry::<FakeAuthority, FakeChild, FakeProvider>::new(0).is_err());
        assert!(
            PiProcessRegistry::<FakeAuthority, FakeChild, FakeProvider>::new(
                MAX_PI_PROCESS_LIMIT + 1
            )
            .is_err()
        );
        assert_eq!(
            PiProcessRegistry::<FakeAuthority, FakeChild, FakeProvider>::production()
                .inspect()
                .limit,
            1
        );
    }

    #[test]
    fn two_concurrent_reservations_have_one_winner_at_limit_one() {
        let registry = Arc::new(Mutex::new(
            PiProcessRegistry::<FakeAuthority, FakeChild, FakeProvider>::new(1).unwrap(),
        ));
        let barrier = Arc::new(Barrier::new(3));
        let handles = [("a", "a1"), ("b", "b1")]
            .into_iter()
            .map(|(journey, run)| {
                let registry = registry.clone();
                let barrier = barrier.clone();
                thread::spawn(move || {
                    barrier.wait();
                    registry.lock().unwrap().reserve(
                        authority(journey, run),
                        FakeProvider {
                            secret: "provider-secret".into(),
                        },
                    )
                })
            })
            .collect::<Vec<_>>();
        barrier.wait();
        let results = handles
            .into_iter()
            .map(|handle| handle.join().unwrap())
            .collect::<Vec<_>>();
        assert_eq!(results.iter().filter(|result| result.is_ok()).count(), 1);
        assert_eq!(
            results
                .iter()
                .filter(|result| matches!(result, Err(ReserveError::CapacityReached)))
                .count(),
            1
        );
        let inspection = registry.lock().unwrap().inspect();
        assert_eq!(inspection.entries.len(), 1);
        assert_eq!(inspection.process_capacity_in_use, 1);
    }

    #[test]
    fn reservation_is_visible_before_start_and_rejection_never_calls_starter() {
        let registry = Arc::new(Mutex::new(
            PiProcessRegistry::<FakeAuthority, FakeChild, FakeProvider>::new(1).unwrap(),
        ));
        let starts = Arc::new(Mutex::new(0_usize));
        let observed_registry = registry.clone();
        let observed_starts = starts.clone();
        let target = reserve_then_start(
            &registry,
            authority("a", "a1"),
            FakeProvider {
                secret: "one".into(),
            },
            move |target| {
                assert_eq!(
                    observed_registry.lock().unwrap().inspect().entries[0]
                        .authority
                        .run_id,
                    target.run_id
                );
                *observed_starts.lock().unwrap() += 1;
                Ok::<(), ()>(())
            },
        )
        .unwrap();
        assert_eq!(target.run_id, "a1");
        assert_eq!(*starts.lock().unwrap(), 1);

        let rejected_starts = starts.clone();
        let rejected = reserve_then_start(
            &registry,
            authority("b", "b1"),
            FakeProvider {
                secret: "two".into(),
            },
            move |_| {
                *rejected_starts.lock().unwrap() += 1;
                Ok::<(), ()>(())
            },
        );
        assert!(matches!(
            rejected,
            Err(ReserveThenStartError::Reservation(
                ReserveError::CapacityReached
            ))
        ));
        assert_eq!(*starts.lock().unwrap(), 1);
    }

    #[test]
    fn duplicate_journey_and_global_capacity_fail_closed() {
        let mut registry =
            PiProcessRegistry::<FakeAuthority, FakeChild, FakeProvider>::new(1).unwrap();
        registry
            .reserve(
                authority("a", "a1"),
                FakeProvider {
                    secret: "one".into(),
                },
            )
            .unwrap();
        assert_eq!(
            registry.reserve(
                authority("a", "a2"),
                FakeProvider {
                    secret: "two".into()
                }
            ),
            Err(ReserveError::DuplicateJourney)
        );
        assert_eq!(
            registry.reserve(
                authority("b", "b1"),
                FakeProvider {
                    secret: "three".into()
                }
            ),
            Err(ReserveError::CapacityReached)
        );
        assert_eq!(registry.inspect().entries[0].authority.run_id, "a1");
    }

    #[test]
    fn process_capacity_releases_while_finalizing_lease_still_blocks_limit_one() {
        let mut registry =
            PiProcessRegistry::<FakeAuthority, FakeChild, FakeProvider>::new(1).unwrap();
        let a1 = registry
            .reserve(
                authority("a", "a1"),
                FakeProvider {
                    secret: "one".into(),
                },
            )
            .unwrap();
        registry.attach_child(&a1, FakeChild::default()).unwrap();
        assert_eq!(
            registry.terminalize(&a1, TerminalState::Completed),
            TerminalizeOutcome::First
        );
        let inspection = registry.inspect();
        assert_eq!(inspection.process_capacity_in_use, 0);
        assert_eq!(
            inspection.entries[0].lease_phase,
            JourneyLeasePhase::Finalizing
        );
        assert_eq!(
            registry.reserve(
                authority("b", "b1"),
                FakeProvider {
                    secret: "two".into()
                }
            ),
            Err(ReserveError::CapacityReached)
        );
    }

    #[test]
    fn directed_cancel_rejects_mismatch_and_targets_exact_child() {
        let mut registry =
            PiProcessRegistry::<FakeAuthority, FakeChild, FakeProvider>::new(1).unwrap();
        let a1 = registry
            .reserve(
                authority("a", "a1"),
                FakeProvider {
                    secret: "one".into(),
                },
            )
            .unwrap();
        registry.attach_child(&a1, FakeChild::default()).unwrap();
        assert_eq!(
            registry.request_cancel(&RunTarget::new("a", "wrong")),
            Err(TargetError::Stale)
        );
        assert_eq!(
            registry.request_cancel(&a1),
            Ok(CancelOutcome::RequestedRunning)
        );
        let child = registry.child_handle(&a1).unwrap();
        child.state.lock().unwrap().kills += 1;
        assert_eq!(child.state.lock().unwrap().kills, 1);
        assert_eq!(
            registry.request_cancel(&a1),
            Ok(CancelOutcome::AlreadyRequested)
        );
    }

    #[test]
    fn child_control_handle_does_not_hold_the_global_registry_mutex() {
        let registry = Arc::new(Mutex::new(
            PiProcessRegistry::<FakeAuthority, FakeChild, FakeProvider>::new(1).unwrap(),
        ));
        let target = registry
            .lock()
            .unwrap()
            .reserve(
                authority("a", "a1"),
                FakeProvider {
                    secret: "one".into(),
                },
            )
            .unwrap();
        registry
            .lock()
            .unwrap()
            .attach_child(&target, FakeChild::default())
            .unwrap();
        let child = registry.lock().unwrap().child_handle(&target).unwrap();
        let child_locked = Arc::new(Barrier::new(2));
        let release_child = Arc::new(Barrier::new(2));
        let handle = {
            let child_locked = child_locked.clone();
            let release_child = release_child.clone();
            thread::spawn(move || {
                let mut state = child.state.lock().unwrap();
                state.waits += 1;
                child_locked.wait();
                release_child.wait();
            })
        };
        child_locked.wait();
        assert_eq!(
            registry
                .lock()
                .unwrap()
                .terminalize(&target, TerminalState::ProcessDied),
            TerminalizeOutcome::First,
        );
        release_child.wait();
        handle.join().unwrap();
    }

    #[test]
    fn directed_child_control_and_wait_failure_use_only_the_cloned_handle() {
        let registry = Arc::new(Mutex::new(
            PiProcessRegistry::<FakeAuthority, FakeChild, FakeProvider>::new(1).unwrap(),
        ));
        let target = registry
            .lock()
            .unwrap()
            .reserve(
                authority("a", "a1"),
                FakeProvider {
                    secret: "one".into(),
                },
            )
            .unwrap();
        registry
            .lock()
            .unwrap()
            .attach_child(&target, FakeChild::default())
            .unwrap();
        let child = registry.lock().unwrap().child_handle(&target).unwrap();
        control_child_handle(&child.state, |state| {
            state.kills += 1;
            Ok::<(), &str>(())
        })
        .unwrap();
        let wait = control_child_handle(&child.state, |state| {
            state.waits += 1;
            Err::<(), _>("wait_failed")
        });
        assert_eq!(wait, Err(ChildControlError::Operation("wait_failed")));
        assert_eq!(child.state.lock().unwrap().kills, 1);
        assert_eq!(child.state.lock().unwrap().waits, 1);
    }

    #[test]
    fn output_joiners_complete_before_done_continuation() {
        let order = Arc::new(Mutex::new(Vec::new()));
        let joins = vec!["stdout", "stderr"];
        let joined_order = order.clone();
        let done_order = order.clone();
        join_before_continuation(
            joins,
            move |name| joined_order.lock().unwrap().push(name),
            move || done_order.lock().unwrap().push("done"),
        );
        assert_eq!(*order.lock().unwrap(), vec!["stdout", "stderr", "done"]);
    }

    #[test]
    fn cancel_before_attachment_is_retained() {
        let mut registry =
            PiProcessRegistry::<FakeAuthority, FakeChild, FakeProvider>::new(1).unwrap();
        let a1 = registry
            .reserve(
                authority("a", "a1"),
                FakeProvider {
                    secret: "one".into(),
                },
            )
            .unwrap();
        assert_eq!(
            registry.request_cancel(&a1),
            Ok(CancelOutcome::RequestedBeforeAttachment)
        );
        assert_eq!(
            registry.attach_child(&a1, FakeChild::default()),
            Ok(AttachOutcome::CancelImmediately)
        );
    }

    #[test]
    fn first_terminal_wins_and_repeated_signals_do_not_underflow_capacity() {
        let mut registry =
            PiProcessRegistry::<FakeAuthority, FakeChild, FakeProvider>::new(1).unwrap();
        let a1 = registry
            .reserve(
                authority("a", "a1"),
                FakeProvider {
                    secret: "one".into(),
                },
            )
            .unwrap();
        registry.attach_child(&a1, FakeChild::default()).unwrap();
        assert_eq!(
            registry.terminalize(&a1, TerminalState::Cancelled),
            TerminalizeOutcome::First
        );
        assert_eq!(
            registry.terminalize(&a1, TerminalState::Completed),
            TerminalizeOutcome::Duplicate
        );
        let inspection = registry.inspect();
        assert_eq!(inspection.process_capacity_in_use, 0);
        assert_eq!(
            inspection.entries[0].terminal_state,
            TerminalState::Cancelled
        );
    }

    #[test]
    fn cancel_done_race_has_one_terminal_winner_without_sleeps() {
        let registry = Arc::new(Mutex::new(
            PiProcessRegistry::<FakeAuthority, FakeChild, FakeProvider>::new(1).unwrap(),
        ));
        let target = registry
            .lock()
            .unwrap()
            .reserve(
                authority("a", "a1"),
                FakeProvider {
                    secret: "one".into(),
                },
            )
            .unwrap();
        registry
            .lock()
            .unwrap()
            .attach_child(&target, FakeChild::default())
            .unwrap();
        let barrier = Arc::new(Barrier::new(3));
        let done_emissions = Arc::new(AtomicUsize::new(0));
        let handles = [TerminalState::Cancelled, TerminalState::Completed]
            .into_iter()
            .map(|terminal| {
                let registry = registry.clone();
                let target = target.clone();
                let barrier = barrier.clone();
                let done_emissions = done_emissions.clone();
                thread::spawn(move || {
                    barrier.wait();
                    let outcome = registry.lock().unwrap().terminalize(&target, terminal);
                    if outcome == TerminalizeOutcome::First {
                        done_emissions.fetch_add(1, Ordering::SeqCst);
                    }
                    outcome
                })
            })
            .collect::<Vec<_>>();
        barrier.wait();
        let outcomes = handles
            .into_iter()
            .map(|handle| handle.join().unwrap())
            .collect::<Vec<_>>();
        assert_eq!(
            outcomes
                .iter()
                .filter(|outcome| **outcome == TerminalizeOutcome::First)
                .count(),
            1
        );
        assert_eq!(
            outcomes
                .iter()
                .filter(|outcome| **outcome == TerminalizeOutcome::Duplicate)
                .count(),
            1
        );
        assert_eq!(done_emissions.load(Ordering::SeqCst), 1);
        let inspection = registry.lock().unwrap().inspect();
        assert_eq!(inspection.process_capacity_in_use, 0);
        assert!(matches!(
            inspection.entries[0].terminal_state,
            TerminalState::Cancelled | TerminalState::Completed
        ));
    }

    #[test]
    fn starter_failure_terminalizes_reservation_and_stale_attachment_is_harmless() {
        let registry = Arc::new(Mutex::new(
            PiProcessRegistry::<FakeAuthority, FakeChild, FakeProvider>::new(1).unwrap(),
        ));
        let failed = reserve_then_start(
            &registry,
            authority("a", "a1"),
            FakeProvider {
                secret: "one".into(),
            },
            |_| Err::<(), _>("spawn_failed"),
        );
        assert!(matches!(
            failed,
            Err(ReserveThenStartError::Start {
                error: "spawn_failed",
                first_terminal: true,
                ..
            })
        ));
        let a1 = RunTarget::new("a", "a1");
        assert_eq!(
            registry.lock().unwrap().inspect().entries[0].terminal_state,
            TerminalState::SpawnFailed
        );
        registry.lock().unwrap().release_lease(&a1).unwrap();
        let a2 = registry
            .lock()
            .unwrap()
            .reserve(
                authority("a", "a2"),
                FakeProvider {
                    secret: "two".into(),
                },
            )
            .unwrap();
        assert_eq!(
            registry
                .lock()
                .unwrap()
                .attach_child(&a1, FakeChild::default()),
            Err(TargetError::Stale)
        );
        assert_eq!(
            registry.lock().unwrap().inspect().entries[0]
                .authority
                .run_id,
            a2.run_id
        );
    }

    #[test]
    fn spawn_failure_and_process_death_retain_finalizing_lease() {
        let mut registry =
            PiProcessRegistry::<FakeAuthority, FakeChild, FakeProvider>::new(1).unwrap();
        let a1 = registry
            .reserve(
                authority("a", "a1"),
                FakeProvider {
                    secret: "one".into(),
                },
            )
            .unwrap();
        assert_eq!(
            registry.terminalize(&a1, TerminalState::SpawnFailed),
            TerminalizeOutcome::First
        );
        assert_eq!(
            registry.inspect().entries[0].terminal_state,
            TerminalState::SpawnFailed
        );
        registry.release_lease(&a1).unwrap();
        let b1 = registry
            .reserve(
                authority("b", "b1"),
                FakeProvider {
                    secret: "two".into(),
                },
            )
            .unwrap();
        registry.attach_child(&b1, FakeChild::default()).unwrap();
        assert_eq!(
            registry.terminalize(&b1, TerminalState::ProcessDied),
            TerminalizeOutcome::First
        );
        assert_eq!(
            registry.inspect().entries[0].terminal_state,
            TerminalState::ProcessDied
        );
    }

    #[test]
    fn stale_callbacks_and_cleanup_cannot_change_replacement_run() {
        let mut registry =
            PiProcessRegistry::<FakeAuthority, FakeChild, FakeProvider>::new(1).unwrap();
        let a1 = registry
            .reserve(
                authority("a", "a1"),
                FakeProvider {
                    secret: "one".into(),
                },
            )
            .unwrap();
        registry.terminalize(&a1, TerminalState::SpawnFailed);
        assert_eq!(registry.release_lease(&a1), Ok(ReleaseOutcome::Released));
        let a2 = registry
            .reserve(
                authority("a", "a2"),
                FakeProvider {
                    secret: "two".into(),
                },
            )
            .unwrap();
        let before = registry.inspect();
        assert_eq!(
            registry.terminalize(&a1, TerminalState::Completed),
            TerminalizeOutcome::Stale
        );
        assert_eq!(registry.request_cancel(&a1), Err(TargetError::Stale));
        assert_eq!(registry.release_lease(&a1), Err(TargetError::Stale));
        assert_eq!(registry.inspect(), before);
        assert_eq!(registry.inspect().entries[0].authority.run_id, a2.run_id);
    }

    #[test]
    fn cleanup_requires_finalizing_and_is_idempotent_without_replacement() {
        let mut registry =
            PiProcessRegistry::<FakeAuthority, FakeChild, FakeProvider>::new(1).unwrap();
        let a1 = registry
            .reserve(
                authority("a", "a1"),
                FakeProvider {
                    secret: "one".into(),
                },
            )
            .unwrap();
        assert_eq!(registry.release_lease(&a1), Err(TargetError::NotFinalizing));
        registry.terminalize(&a1, TerminalState::SpawnFailed);
        assert_eq!(registry.release_lease(&a1), Ok(ReleaseOutcome::Released));
        assert_eq!(
            registry.release_lease(&a1),
            Ok(ReleaseOutcome::AlreadyReleased)
        );
        assert_eq!(
            registry.release_lease(&RunTarget::new("unknown", "unknown")),
            Err(TargetError::Missing)
        );
    }

    #[test]
    fn inspection_is_deterministic_bounded_and_private() {
        let mut registry =
            PiProcessRegistry::<FakeAuthority, FakeChild, FakeProvider>::new(2).unwrap();
        registry
            .reserve(
                authority("z", "z1"),
                FakeProvider {
                    secret: "provider-z".into(),
                },
            )
            .unwrap();
        registry
            .reserve(
                authority("a", "a1"),
                FakeProvider {
                    secret: "provider-a".into(),
                },
            )
            .unwrap();
        let inspection = registry.inspect();
        assert_eq!(
            inspection
                .entries
                .iter()
                .map(|entry| entry.authority.journey_id.as_str())
                .collect::<Vec<_>>(),
            vec!["a", "z"]
        );
        let serialized = to_value(&inspection).unwrap().to_string();
        for private in [
            "private_session_file",
            "/private/",
            "provider-z",
            "provider-a",
            "secret",
            "prompt",
            "response",
            "environment",
            "stdout",
            "stderr",
        ] {
            assert!(!serialized.contains(private), "inspection leaked {private}");
        }
        assert!(inspection.entries.len() <= inspection.limit);
    }
}
