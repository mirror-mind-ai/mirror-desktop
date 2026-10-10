use serde::Serialize;
use std::collections::{HashMap, VecDeque};
use std::sync::{Arc, Mutex};

// CV-008.DS-002: four is the deliberately bounded supported concurrency horizon.
pub const PRODUCTION_PI_PROCESS_LIMIT: usize = 4;
/// CR139: how many live Pi invocations one Journey may hold at once.
///
/// Three, derived from the three consumers that can occupy a slot: the Navigator's Journey
/// workspace, a conversation workspace, and a background title suggestion. The alternative — two,
/// with title suggestions excluded — was rejected because excluding them requires the registry to
/// classify a run by kind, and a kind read from a `run_id` prefix is exactly the inference this
/// project avoids. Falsifiable: a fourth consumer reopens the number.
pub const PER_JOURNEY_PI_WORKSPACE_SHARE: usize = 3;
const MAX_PI_PROCESS_LIMIT: usize = 16;
// Shutdown drains every child admitted by the production registry, without an independent bound.
const MAX_BOUNDED_CHILD_CONTROLS: usize = PRODUCTION_PI_PROCESS_LIMIT;

pub trait RegistryAuthority: Clone {
    fn journey_id(&self) -> &str;
    /// CR139: the second half of the admission key. A workspace is a Journey plus a thread.
    fn thread_id(&self) -> &str;
    fn run_id(&self) -> &str;
    fn inspection_identity(&self) -> RegistryAuthorityInspection;
}

/// The registry's map key. `|` cannot appear in an identifier, so no pair of distinct coordinates
/// can collide into one key — the same separator and the same reasoning as the renderer's
/// `runtimeWorkspaceKey`.
fn workspace_key(journey_id: &str, thread_id: &str) -> String {
    format!("{journey_id}|{thread_id}")
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
    /// This exact workspace already holds an active or finalizing invocation.
    DuplicateWorkspace,
    /// The workspace is free, but the Journey is already running its full share.
    JourneyShareExceeded,
    /// The global process capacity is occupied, regardless of Journey.
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

pub fn control_bounded_child_handles<C, R, E>(
    handles: impl IntoIterator<Item = (RunTarget, C)>,
    mut operation: impl FnMut(&RunTarget, &C) -> Result<R, E>,
) -> Vec<(RunTarget, Result<R, E>)> {
    handles
        .into_iter()
        .take(MAX_BOUNDED_CHILD_CONTROLS)
        .map(|(target, child)| {
            let outcome = operation(&target, &child);
            (target, outcome)
        })
        .collect()
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

impl PiInvocationLeaseInspection {
    pub fn is_active_execution(&self) -> bool {
        self.terminal_state == TerminalState::Open
            && matches!(self.lease_phase, JourneyLeasePhase::Reserved | JourneyLeasePhase::Running)
            && matches!(self.process_capacity_state, ProcessCapacityState::Reserved | ProcessCapacityState::Running)
    }
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
        let key = workspace_key(&journey_id, authority.thread_id());
        let existing_is_terminal_finalization = self.entries.get(&key)
            .map(Self::is_terminal_finalization);
        if existing_is_terminal_finalization == Some(false) {
            return Err(ReserveError::DuplicateWorkspace);
        }
        // The share is checked before global capacity, so a Journey that has filled its own share
        // is told that rather than being handed the global reason, which would be true of the
        // system and false about the cause. A finalizing entry holds no capacity and so counts
        // toward nothing: a corpse must not be able to refuse a live workspace.
        if self.live_entries_in_journey(&journey_id) >= PER_JOURNEY_PI_WORKSPACE_SHARE {
            return Err(ReserveError::JourneyShareExceeded);
        }
        if self.process_capacity_in_use >= self.limit {
            return Err(ReserveError::CapacityReached);
        }
        if existing_is_terminal_finalization == Some(true) {
            self.retire_finalizing_workspace(&key);
        }
        while self.entries.len() >= self.limit {
            let retireable = self.entries.iter()
                .filter(|(_, entry)| Self::is_terminal_finalization(entry))
                .map(|(key, _)| key.clone())
                .min();
            let Some(retireable) = retireable else {
                return Err(ReserveError::CapacityReached);
            };
            self.retire_finalizing_workspace(&retireable);
        }
        let target = RunTarget::new(&journey_id, authority.run_id());
        self.entries.insert(
            key,
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
        let Ok(key) = self.resolve_key(target) else {
            return TerminalizeOutcome::Stale;
        };
        let Some(entry) = self.entries.get_mut(&key) else {
            return TerminalizeOutcome::Stale;
        };
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
        let key = match self.resolve_key(target) {
            Ok(key) => key,
            Err(error) => {
                return if self.was_released(target) {
                    Ok(ReleaseOutcome::AlreadyReleased)
                } else {
                    Err(error)
                };
            }
        };
        let entry = self.entries.get(&key).ok_or(TargetError::Missing)?;
        if !Self::is_terminal_finalization(entry) {
            return Err(TargetError::NotFinalizing);
        }
        self.entries.remove(&key);
        self.remember_released(target.clone());
        Ok(ReleaseOutcome::Released)
    }

    fn live_entries_in_journey(&self, journey_id: &str) -> usize {
        self.entries.values()
            .filter(|entry| entry.authority.journey_id() == journey_id)
            .filter(|entry| !Self::is_terminal_finalization(entry))
            .count()
    }

    /// CR139: `RunTarget` deliberately stays `(journey_id, run_id)` — that pair is already unique,
    /// because a `run_id` is minted per turn, and two Tauri commands receive exactly those two
    /// coordinates from the renderer. Only the map key changed, so resolution scans the values
    /// instead of hashing. The map is bounded by `limit`, so this walks at most four records under
    /// a lock already held.
    ///
    /// `Missing` and `Stale` keep their current meanings: a Journey that holds some entry but not
    /// this run is stale, and a Journey that holds nothing is missing.
    fn resolve_key(&self, target: &RunTarget) -> Result<String, TargetError> {
        let mut journey_seen = false;
        for (key, entry) in self.entries.iter() {
            if entry.authority.journey_id() != target.journey_id {
                continue;
            }
            journey_seen = true;
            if entry.authority.run_id() == target.run_id {
                return Ok(key.clone());
            }
        }
        Err(if journey_seen { TargetError::Stale } else { TargetError::Missing })
    }

    fn is_terminal_finalization(entry: &RegistryEntry<A, C, P>) -> bool {
        entry.lease_phase == JourneyLeasePhase::Finalizing
            && entry.process_capacity_state == ProcessCapacityState::Released
            && entry.terminal_state != TerminalState::Open
    }

    fn retire_finalizing_workspace(&mut self, key: &str) -> bool {
        let target = self.entries.get(key).and_then(|entry| {
            Self::is_terminal_finalization(entry).then(|| {
                RunTarget::new(entry.authority.journey_id(), entry.authority.run_id())
            })
        });
        let Some(target) = target else { return false; };
        self.entries.remove(key);
        self.remember_released(target);
        true
    }

    fn remember_released(&mut self, target: RunTarget) {
        if !self.was_released(&target) {
            self.released_targets.push_back(target);
        }
        while self.released_targets.len() > self.limit.saturating_mul(2) {
            self.released_targets.pop_front();
        }
    }

    fn was_released(&self, target: &RunTarget) -> bool {
        self.released_targets.iter().any(|released| released == target)
    }

    pub fn running_child_handles(&self) -> Vec<(RunTarget, C)>
    where
        C: Clone,
    {
        let mut children = self
            .entries
            .values()
            .filter_map(|entry| {
                if entry.terminal_state != TerminalState::Open
                    || entry.lease_phase != JourneyLeasePhase::Running
                {
                    return None;
                }
                entry.child.clone().map(|child| (
                    RunTarget::new(entry.authority.journey_id(), entry.authority.run_id()),
                    child,
                ))
            })
            .collect::<Vec<_>>();
        // CR139: a Journey can hold siblings, so ordering by Journey alone leaves their order to
        // `HashMap` iteration. Shutdown must drain the same sequence every time.
        children.sort_by(|(left, _), (right, _)| {
            left.journey_id.cmp(&right.journey_id).then_with(|| left.run_id.cmp(&right.run_id))
        });
        children.truncate(self.limit);
        children
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
        // CR139: siblings must come out in a stable order, or the renderer's entry sequence would
        // vary between inspections of an unchanged registry.
        entries.sort_by(|left, right| {
            left.authority.journey_id.cmp(&right.authority.journey_id)
                .then_with(|| left.authority.thread_id.cmp(&right.authority.thread_id))
        });
        entries.truncate(self.limit);
        PiInvocationRegistryInspection {
            schema_version: "0.1.0".to_string(),
            limit: self.limit,
            process_capacity_in_use: self.process_capacity_in_use,
            entries,
        }
    }

    fn matching_entry(&self, target: &RunTarget) -> Result<&RegistryEntry<A, C, P>, TargetError> {
        let key = self.resolve_key(target)?;
        self.entries.get(&key).ok_or(TargetError::Missing)
    }

    fn matching_entry_mut(
        &mut self,
        target: &RunTarget,
    ) -> Result<&mut RegistryEntry<A, C, P>, TargetError> {
        let key = self.resolve_key(target)?;
        self.entries.get_mut(&key).ok_or(TargetError::Missing)
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
        thread_id: String,
        run_id: String,
        private_session_file: String,
    }

    impl RegistryAuthority for FakeAuthority {
        fn journey_id(&self) -> &str {
            &self.journey_id
        }
        fn thread_id(&self) -> &str {
            &self.thread_id
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
                thread_id: self.thread_id.clone(),
                generation: 1,
                // CR139: a Pi session and a Mirror conversation belong to a thread, not to a
                // Journey. Deriving them from the Journey made sibling workspaces collide in the
                // fixture, which would have been an unfaithful sample of what the renderer parses.
                pi_session_id: format!("pi-{}", self.thread_id),
                mirror_conversation_id: format!("mirror-{}", self.thread_id),
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

    /// Keeps `thread-{journey}` so every pre-existing case stays in one workspace per Journey and
    /// its verdict is unchanged by the re-key.
    fn authority(journey: &str, run: &str) -> FakeAuthority {
        workspace_authority(journey, &format!("thread-{journey}"), run)
    }

    fn workspace_authority(journey: &str, thread: &str, run: &str) -> FakeAuthority {
        FakeAuthority {
            journey_id: journey.into(),
            thread_id: thread.into(),
            run_id: run.into(),
            private_session_file: format!("/private/{journey}/{thread}/{run}.jsonl"),
        }
    }

    fn provider() -> FakeProvider {
        FakeProvider { secret: "provider-secret".into() }
    }

    fn journey_ids(inspection: &PiInvocationRegistryInspection) -> Vec<&str> {
        inspection.entries.iter().map(|entry| entry.authority.journey_id.as_str()).collect()
    }

    fn workspace_pairs(inspection: &PiInvocationRegistryInspection) -> Vec<(&str, &str)> {
        inspection.entries.iter()
            .map(|entry| (entry.authority.journey_id.as_str(), entry.authority.thread_id.as_str()))
            .collect()
    }

    // ---- CR139: workspace-grained admission -------------------------------------------------

    #[test]
    fn two_workspaces_in_one_journey_reserve_run_and_retire_independently() {
        let mut registry =
            PiProcessRegistry::<FakeAuthority, FakeChild, FakeProvider>::production();
        let root = registry.reserve(workspace_authority("a", "thread-root", "run-root"), provider()).unwrap();
        let chat = registry.reserve(workspace_authority("a", "thread-chat", "run-chat"), provider()).unwrap();
        registry.attach_child(&root, FakeChild::default()).unwrap();
        registry.attach_child(&chat, FakeChild::default()).unwrap();
        assert_eq!(registry.inspect().process_capacity_in_use, 2);
        assert_eq!(registry.inspect().entries.len(), 2);

        // Retiring one workspace leaves the other's handle and bytes untouched.
        let chat_before = registry.inspect().entries.into_iter()
            .find(|entry| entry.authority.thread_id == "thread-chat").unwrap();
        let chat_child = registry.child_handle(&chat).unwrap();
        assert_eq!(registry.terminalize(&root, TerminalState::Completed), TerminalizeOutcome::First);
        assert_eq!(registry.release_lease(&root), Ok(ReleaseOutcome::Released));
        let chat_after = registry.inspect().entries.into_iter()
            .find(|entry| entry.authority.thread_id == "thread-chat").unwrap();
        assert_eq!(chat_after, chat_before);
        assert!(Arc::ptr_eq(&registry.child_handle(&chat).unwrap().state, &chat_child.state));
        assert_eq!(registry.inspect().process_capacity_in_use, 1);
    }

    #[test]
    fn the_same_workspace_twice_is_refused_by_its_own_name() {
        let mut registry =
            PiProcessRegistry::<FakeAuthority, FakeChild, FakeProvider>::production();
        registry.reserve(workspace_authority("a", "thread-root", "run-1"), provider()).unwrap();
        assert_eq!(
            registry.reserve(workspace_authority("a", "thread-root", "run-2"), provider()),
            Err(ReserveError::DuplicateWorkspace),
        );
        // A different workspace in the same Journey is admitted, which is the whole point.
        assert!(registry.reserve(workspace_authority("a", "thread-chat", "run-3"), provider()).is_ok());
    }

    #[test]
    fn a_fourth_live_workspace_in_one_journey_is_refused_by_the_share_not_by_capacity() {
        let mut registry =
            PiProcessRegistry::<FakeAuthority, FakeChild, FakeProvider>::production();
        for index in 0..PER_JOURNEY_PI_WORKSPACE_SHARE {
            registry.reserve(
                workspace_authority("a", &format!("thread-{index}"), &format!("run-{index}")),
                provider(),
            ).unwrap();
        }
        // Global capacity is 4 and only 3 are in use, so a generic `CapacityReached` here would be
        // a refusal with no resource behind it.
        assert_eq!(registry.inspect().process_capacity_in_use, 3);
        assert_eq!(
            registry.reserve(workspace_authority("a", "thread-overflow", "run-overflow"), provider()),
            Err(ReserveError::JourneyShareExceeded),
        );
        // Another Journey still gets the fourth global slot.
        assert!(registry.reserve(workspace_authority("b", "thread-root", "run-b"), provider()).is_ok());
        assert_eq!(
            registry.reserve(workspace_authority("c", "thread-root", "run-c"), provider()),
            Err(ReserveError::CapacityReached),
        );
    }

    #[test]
    fn a_finalizing_sibling_counts_toward_neither_the_share_nor_capacity() {
        let mut registry =
            PiProcessRegistry::<FakeAuthority, FakeChild, FakeProvider>::production();
        let dead = registry.reserve(workspace_authority("a", "thread-dead", "run-dead"), provider()).unwrap();
        registry.attach_child(&dead, FakeChild::default()).unwrap();
        registry.reserve(workspace_authority("a", "thread-one", "run-one"), provider()).unwrap();
        registry.reserve(workspace_authority("a", "thread-two", "run-two"), provider()).unwrap();
        assert_eq!(
            registry.reserve(workspace_authority("a", "thread-three", "run-three"), provider()),
            Err(ReserveError::JourneyShareExceeded),
        );
        // Terminalizing leaves a finalizing entry that holds no capacity. A corpse must not be able
        // to refuse the Journey's third workspace.
        assert_eq!(registry.terminalize(&dead, TerminalState::Completed), TerminalizeOutcome::First);
        assert_eq!(registry.inspect().process_capacity_in_use, 2);
        assert!(registry.reserve(workspace_authority("a", "thread-three", "run-three"), provider()).is_ok());
    }

    #[test]
    fn a_successor_retires_only_its_own_workspace_finalizing_lease() {
        let mut registry =
            PiProcessRegistry::<FakeAuthority, FakeChild, FakeProvider>::production();
        let first = registry.reserve(workspace_authority("a", "thread-root", "run-1"), provider()).unwrap();
        let sibling = registry.reserve(workspace_authority("a", "thread-chat", "run-chat"), provider()).unwrap();
        registry.attach_child(&first, FakeChild::default()).unwrap();
        registry.attach_child(&sibling, FakeChild::default()).unwrap();
        assert_eq!(registry.terminalize(&first, TerminalState::Completed), TerminalizeOutcome::First);
        assert_eq!(registry.terminalize(&sibling, TerminalState::Completed), TerminalizeOutcome::First);

        // CR116's semantics, narrowed: the successor replaces its own workspace's finalizing lease
        // and leaves the sibling's alone to be released on its own terms.
        let successor = registry.reserve(workspace_authority("a", "thread-root", "run-2"), provider()).unwrap();
        assert_eq!(registry.release_lease(&first), Ok(ReleaseOutcome::AlreadyReleased));
        let inspection = registry.inspect();
        assert_eq!(workspace_pairs(&inspection), vec![("a", "thread-chat"), ("a", "thread-root")]);
        assert_eq!(
            inspection.entries.iter()
                .find(|entry| entry.authority.thread_id == "thread-root").unwrap().authority.run_id,
            successor.run_id,
        );
        assert_eq!(registry.release_lease(&sibling), Ok(ReleaseOutcome::Released));
    }

    #[test]
    fn sibling_workspaces_share_released_memory_exactly_as_distinct_journeys_do() {
        // The share makes `reserve`'s eviction loop an ordinary path rather than an edge case, and
        // `released_targets` is what turns a late release into `AlreadyReleased` instead of
        // `Missing`. The plan said to measure whether the bound of `limit * 2` was still enough
        // rather than widening it on suspicion.
        //
        // Measured answer: the bound is unchanged by the re-key. Churning past it forgets the
        // oldest target, but it forgets *identically* across three sibling workspaces and across
        // three distinct Journeys, because the number of live workspaces is still bounded by
        // `limit` — each live entry consumes one capacity unit. The retention window is therefore
        // a pre-existing property, not a consequence of CR139, and widening it here would have
        // been a cap no measurement supports. This test pins the equivalence so an asymmetry
        // between the two grains cannot appear unnoticed.
        fn churn(rounds: usize, same_journey: bool) -> usize {
            let mut registry =
                PiProcessRegistry::<FakeAuthority, FakeChild, FakeProvider>::production();
            let mut settled = Vec::new();
            for round in 0..rounds {
                for slot in 0..PER_JOURNEY_PI_WORKSPACE_SHARE {
                    let authority = if same_journey {
                        workspace_authority("a", &format!("thread-{slot}"), &format!("run-{round}-{slot}"))
                    } else {
                        workspace_authority(&format!("j{slot}"), "thread-root", &format!("run-{round}-{slot}"))
                    };
                    let target = registry.reserve(authority, provider()).unwrap();
                    registry.attach_child(&target, FakeChild::default()).unwrap();
                    assert_eq!(registry.terminalize(&target, TerminalState::Completed), TerminalizeOutcome::First);
                    assert_eq!(registry.release_lease(&target), Ok(ReleaseOutcome::Released));
                    settled.push(target);
                }
            }
            settled.iter()
                .filter(|target| registry.release_lease(target) != Ok(ReleaseOutcome::AlreadyReleased))
                .count()
        }

        // Within the window, every settled target still answers `AlreadyReleased`.
        assert_eq!(churn(2, true), 0);
        assert_eq!(churn(2, false), 0);
        // Past the window, sibling workspaces and distinct Journeys forget the same amount.
        assert_eq!(churn(3, true), churn(3, false));
        assert!(churn(3, true) > 0, "the probe must stay past the retention window to be meaningful");
    }

    #[test]
    fn inspection_orders_siblings_by_workspace_so_the_renderer_sees_a_stable_sequence() {
        let mut registry =
            PiProcessRegistry::<FakeAuthority, FakeChild, FakeProvider>::production();
        // Inserted in an order that a Journey-only sort would leave ambiguous between siblings.
        registry.reserve(workspace_authority("b", "thread-zeta", "run-bz"), provider()).unwrap();
        registry.reserve(workspace_authority("a", "thread-zeta", "run-az"), provider()).unwrap();
        registry.reserve(workspace_authority("a", "thread-alpha", "run-aa"), provider()).unwrap();
        let first = registry.inspect();
        assert_eq!(workspace_pairs(&first), vec![
            ("a", "thread-alpha"),
            ("a", "thread-zeta"),
            ("b", "thread-zeta"),
        ]);
        // Stable across calls, which a `HashMap` iteration order would not be.
        for _ in 0..8 {
            assert_eq!(workspace_pairs(&registry.inspect()), workspace_pairs(&first));
        }
        assert_eq!(journey_ids(&first), vec!["a", "a", "b"]);
    }

    #[test]
    fn a_target_resolves_by_run_without_the_thread_so_the_ipc_boundary_is_unchanged() {
        // `RunTarget` stays `(journey_id, run_id)`: the renderer cancels and releases with exactly
        // the two coordinates it already sends.
        let mut registry =
            PiProcessRegistry::<FakeAuthority, FakeChild, FakeProvider>::production();
        let root = registry.reserve(workspace_authority("a", "thread-root", "run-root"), provider()).unwrap();
        let chat = registry.reserve(workspace_authority("a", "thread-chat", "run-chat"), provider()).unwrap();
        assert_eq!(root, RunTarget::new("a", "run-root"));
        registry.attach_child(&root, FakeChild::default()).unwrap();
        registry.attach_child(&chat, FakeChild::default()).unwrap();
        assert_eq!(registry.request_cancel(&RunTarget::new("a", "run-chat")), Ok(CancelOutcome::RequestedRunning));
        assert_eq!(registry.cancellation_requested(&root), Ok(false));
        assert_eq!(registry.cancellation_requested(&chat), Ok(true));

        // The Missing/Stale distinction is preserved: a known Journey with an unknown run is stale,
        // an unknown Journey is missing.
        assert_eq!(registry.request_cancel(&RunTarget::new("a", "run-ghost")), Err(TargetError::Stale));
        assert_eq!(registry.request_cancel(&RunTarget::new("ghost", "run-ghost")), Err(TargetError::Missing));
    }

    #[test]
    fn shutdown_drains_sibling_workspaces_in_a_stable_workspace_order() {
        let mut registry =
            PiProcessRegistry::<FakeAuthority, FakeChild, FakeProvider>::production();
        for (journey, thread, run) in [
            ("b", "thread-root", "run-b"),
            ("a", "thread-zeta", "run-az"),
            ("a", "thread-alpha", "run-aa"),
        ] {
            let target = registry.reserve(workspace_authority(journey, thread, run), provider()).unwrap();
            registry.attach_child(&target, FakeChild::default()).unwrap();
        }
        let handles = registry.running_child_handles();
        assert_eq!(
            handles.iter().map(|(target, _)| target.run_id.as_str()).collect::<Vec<_>>(),
            vec!["run-aa", "run-az", "run-b"],
        );
    }


    #[test]
    fn production_limit_is_exactly_four_after_expanded_concurrency_and_invalid_limits_fail() {
        assert_eq!(PRODUCTION_PI_PROCESS_LIMIT, 4);
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
            4
        );
    }

    #[test]
    fn four_different_journeys_fill_production_capacity_and_a_fifth_never_starts() {
        let registry = Arc::new(Mutex::new(
            PiProcessRegistry::<FakeAuthority, FakeChild, FakeProvider>::production(),
        ));
        let starts = Arc::new(AtomicUsize::new(0));
        let barrier = Arc::new(Barrier::new(5));
        let handles = [("a", "a1"), ("b", "b1"), ("c", "c1"), ("d", "d1")]
            .into_iter()
            .map(|(journey, run)| {
                let registry = registry.clone();
                let starts = starts.clone();
                let barrier = barrier.clone();
                thread::spawn(move || {
                    barrier.wait();
                    reserve_then_start(
                        &registry,
                        authority(journey, run),
                        FakeProvider { secret: journey.into() },
                        |_| {
                            starts.fetch_add(1, Ordering::SeqCst);
                            Ok::<(), ()>(())
                        },
                    )
                })
            })
            .collect::<Vec<_>>();
        barrier.wait();
        let mut admitted = handles
            .into_iter()
            .map(|handle| handle.join().unwrap().unwrap())
            .collect::<Vec<_>>();
        admitted.sort_by(|left, right| left.journey_id.cmp(&right.journey_id));
        assert_eq!(admitted, vec![
            RunTarget::new("a", "a1"),
            RunTarget::new("b", "b1"),
            RunTarget::new("c", "c1"),
            RunTarget::new("d", "d1"),
        ]);
        assert_eq!(starts.load(Ordering::SeqCst), 4);
        {
            let mut registry = registry.lock().unwrap();
            for target in &admitted {
                assert_eq!(
                    registry.attach_child(target, FakeChild::default()),
                    Ok(AttachOutcome::Attached),
                );
            }
            assert!(registry
                .inspect()
                .entries
                .iter()
                .all(|entry| entry.process_capacity_state == ProcessCapacityState::Running));
        }

        let fifth = reserve_then_start(
            &registry,
            authority("e", "e1"),
            FakeProvider { secret: "e".into() },
            |_| {
                starts.fetch_add(1, Ordering::SeqCst);
                Ok::<(), ()>(())
            },
        );
        assert!(matches!(
            fifth,
            Err(ReserveThenStartError::Reservation(ReserveError::CapacityReached))
        ));
        assert_eq!(starts.load(Ordering::SeqCst), 4);
        let inspection = registry.lock().unwrap().inspect();
        assert_eq!(inspection.limit, 4);
        assert_eq!(inspection.process_capacity_in_use, 4);
        assert_eq!(
            inspection.entries.iter().map(|entry| entry.authority.journey_id.as_str()).collect::<Vec<_>>(),
            vec!["a", "b", "c", "d"],
        );
    }

    #[test]
    fn five_concurrent_reservations_have_exactly_four_winners_at_production_limit() {
        let registry = Arc::new(Mutex::new(
            PiProcessRegistry::<FakeAuthority, FakeChild, FakeProvider>::production(),
        ));
        let barrier = Arc::new(Barrier::new(6));
        let handles = [("a", "a1"), ("b", "b1"), ("c", "c1"), ("d", "d1"), ("e", "e1")]
            .into_iter()
            .map(|(journey, run)| {
                let registry = registry.clone();
                let barrier = barrier.clone();
                thread::spawn(move || {
                    barrier.wait();
                    registry.lock().unwrap().reserve(
                        authority(journey, run),
                        FakeProvider { secret: journey.into() },
                    )
                })
            })
            .collect::<Vec<_>>();
        barrier.wait();
        let results = handles
            .into_iter()
            .map(|handle| handle.join().unwrap())
            .collect::<Vec<_>>();
        assert_eq!(results.iter().filter(|result| result.is_ok()).count(), 4);
        assert_eq!(
            results.iter().filter(|result| matches!(result, Err(ReserveError::CapacityReached))).count(),
            1,
        );
        let inspection = registry.lock().unwrap().inspect();
        assert_eq!(inspection.entries.len(), 4);
        assert_eq!(inspection.process_capacity_in_use, 4);
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
    fn duplicate_workspace_and_global_capacity_fail_closed() {
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
        // CR139: `authority` keeps both runs in `thread-a`, so this is the same workspace and the
        // refusal is named for the workspace. The verdict — a second run here never starts — is
        // unchanged.
        assert_eq!(
            registry.reserve(
                authority("a", "a2"),
                FakeProvider {
                    secret: "two".into()
                }
            ),
            Err(ReserveError::DuplicateWorkspace)
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
    fn terminal_finalization_releases_limit_one_for_an_immediate_successor() {
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
        assert_eq!(inspection.entries[0].lease_phase, JourneyLeasePhase::Finalizing);

        let a2 = registry.reserve(
            authority("a", "a2"),
            FakeProvider { secret: "two".into() },
        ).unwrap();
        registry.attach_child(&a2, FakeChild::default()).unwrap();
        assert_eq!(registry.release_lease(&a1), Ok(ReleaseOutcome::AlreadyReleased));
        assert!(registry.child_handle(&a2).is_ok());
        assert_eq!(registry.inspect().entries[0].authority.run_id, "a2");
    }

    #[test]
    fn every_terminal_outcome_releases_same_journey_occupancy() {
        for terminal in [
            TerminalState::Completed,
            TerminalState::Cancelled,
            TerminalState::SpawnFailed,
            TerminalState::ProcessDied,
        ] {
            let mut registry =
                PiProcessRegistry::<FakeAuthority, FakeChild, FakeProvider>::new(1).unwrap();
            let a1 = registry.reserve(
                authority("a", "a1"),
                FakeProvider { secret: "one".into() },
            ).unwrap();
            registry.attach_child(&a1, FakeChild::default()).unwrap();
            assert_eq!(registry.terminalize(&a1, terminal), TerminalizeOutcome::First);
            assert!(!registry.inspect().entries[0].is_active_execution());
            let a2 = registry.reserve(
                authority("a", "a2"),
                FakeProvider { secret: "two".into() },
            ).unwrap();
            assert_eq!(registry.release_lease(&a1), Ok(ReleaseOutcome::AlreadyReleased));
            assert_eq!(registry.inspect().entries[0].authority.run_id, a2.run_id);
        }
    }

    #[test]
    fn terminal_finalization_does_not_consume_capacity_or_disturb_an_active_sibling() {
        let mut registry =
            PiProcessRegistry::<FakeAuthority, FakeChild, FakeProvider>::new(2).unwrap();
        let a1 = registry.reserve(
            authority("a", "a1"),
            FakeProvider { secret: "a".into() },
        ).unwrap();
        let b1 = registry.reserve(
            authority("b", "b1"),
            FakeProvider { secret: "b".into() },
        ).unwrap();
        registry.attach_child(&a1, FakeChild::default()).unwrap();
        registry.attach_child(&b1, FakeChild::default()).unwrap();
        assert_eq!(registry.terminalize(&a1, TerminalState::Completed), TerminalizeOutcome::First);
        assert_eq!(registry.inspect().process_capacity_in_use, 1);

        let c1 = registry.reserve(
            authority("c", "c1"),
            FakeProvider { secret: "c".into() },
        ).unwrap();
        registry.attach_child(&c1, FakeChild::default()).unwrap();
        assert_eq!(registry.release_lease(&a1), Ok(ReleaseOutcome::AlreadyReleased));
        let inspection = registry.inspect();
        assert_eq!(inspection.process_capacity_in_use, 2);
        assert_eq!(
            inspection.entries.iter().map(|entry| entry.authority.run_id.as_str()).collect::<Vec<_>>(),
            vec!["b1", "c1"],
        );
        assert!(registry.child_handle(&b1).is_ok());
        assert!(registry.child_handle(&c1).is_ok());
    }

    #[test]
    fn targeted_cancel_at_limit_two_preserves_the_sibling_bytes_and_handle() {
        let mut registry =
            PiProcessRegistry::<FakeAuthority, FakeChild, FakeProvider>::new(2).unwrap();
        let a1 = registry.reserve(
            authority("a", "a1"),
            FakeProvider { secret: "a".into() },
        ).unwrap();
        let b1 = registry.reserve(
            authority("b", "b1"),
            FakeProvider { secret: "b".into() },
        ).unwrap();
        registry.attach_child(&a1, FakeChild::default()).unwrap();
        registry.attach_child(&b1, FakeChild::default()).unwrap();
        let b_before = registry.inspect().entries.into_iter()
            .find(|entry| entry.authority.journey_id == "b").unwrap();
        let b_child = registry.child_handle(&b1).unwrap();

        assert_eq!(registry.request_cancel(&a1), Ok(CancelOutcome::RequestedRunning));
        assert_eq!(registry.request_cancel(&a1), Ok(CancelOutcome::AlreadyRequested));
        let a_child = registry.child_handle(&a1).unwrap();
        control_child_handle(&a_child.state, |state| {
            state.kills += 1;
            Ok::<(), ()>(())
        }).unwrap();

        let b_after = registry.inspect().entries.into_iter()
            .find(|entry| entry.authority.journey_id == "b").unwrap();
        assert_eq!(b_after, b_before);
        assert!(Arc::ptr_eq(&registry.child_handle(&b1).unwrap().state, &b_child.state));
        assert_eq!(b_child.state.lock().unwrap().kills, 0);
        assert_eq!(registry.inspect().process_capacity_in_use, 2);
    }

    #[test]
    fn process_death_terminalizes_only_its_owner_and_rejects_late_cancel() {
        let mut registry =
            PiProcessRegistry::<FakeAuthority, FakeChild, FakeProvider>::new(2).unwrap();
        let a1 = registry.reserve(
            authority("a", "a1"),
            FakeProvider { secret: "a".into() },
        ).unwrap();
        let b1 = registry.reserve(
            authority("b", "b1"),
            FakeProvider { secret: "b".into() },
        ).unwrap();
        registry.attach_child(&a1, FakeChild::default()).unwrap();
        registry.attach_child(&b1, FakeChild::default()).unwrap();
        let b_before = registry.inspect().entries.into_iter()
            .find(|entry| entry.authority.journey_id == "b").unwrap();

        assert_eq!(
            registry.terminalize(&a1, TerminalState::ProcessDied),
            TerminalizeOutcome::First,
        );
        assert_eq!(registry.request_cancel(&a1), Err(TargetError::NotRunning));
        assert_eq!(
            registry.terminalize(&a1, TerminalState::Cancelled),
            TerminalizeOutcome::Duplicate,
        );

        let inspection = registry.inspect();
        let a_after = inspection.entries.iter()
            .find(|entry| entry.authority.journey_id == "a").unwrap();
        let b_after = inspection.entries.iter()
            .find(|entry| entry.authority.journey_id == "b").unwrap();
        assert_eq!(a_after.terminal_state, TerminalState::ProcessDied);
        assert_eq!(b_after, &b_before);
        assert!(registry.child_handle(&b1).is_ok());
        assert_eq!(inspection.process_capacity_in_use, 1);
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
        assert_eq!(registry.release_lease(&a1), Ok(ReleaseOutcome::AlreadyReleased));
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
    fn bounded_child_control_attempts_all_four_exact_handles_after_one_failure() {
        let handles = vec![
            (RunTarget::new("a", "a1"), FakeChild::default()),
            (RunTarget::new("b", "b1"), FakeChild::default()),
            (RunTarget::new("c", "c1"), FakeChild::default()),
            (RunTarget::new("d", "d1"), FakeChild::default()),
            (RunTarget::new("e", "e1"), FakeChild::default()),
        ];
        let attempts = Arc::new(Mutex::new(Vec::new()));
        let recorded = attempts.clone();
        let outcomes = control_bounded_child_handles(handles, move |target, child| {
            recorded.lock().unwrap().push(target.clone());
            child.state.lock().unwrap().kills += 1;
            if target.journey_id == "a" { Err("a_failed") } else { Ok(()) }
        });

        assert_eq!(*attempts.lock().unwrap(), vec![
            RunTarget::new("a", "a1"),
            RunTarget::new("b", "b1"),
            RunTarget::new("c", "c1"),
            RunTarget::new("d", "d1"),
        ]);
        assert_eq!(outcomes.len(), 4);
        assert_eq!(outcomes[0], (RunTarget::new("a", "a1"), Err("a_failed")));
        assert_eq!(outcomes[1], (RunTarget::new("b", "b1"), Ok(())));
        assert_eq!(outcomes[2], (RunTarget::new("c", "c1"), Ok(())));
        assert_eq!(outcomes[3], (RunTarget::new("d", "d1"), Ok(())));
    }

    #[test]
    fn shutdown_snapshot_contains_four_sorted_running_child_handles() {
        let mut registry =
            PiProcessRegistry::<FakeAuthority, FakeChild, FakeProvider>::new(4).unwrap();
        let targets = [("b", "b1"), ("a", "a1"), ("d", "d1"), ("c", "c1")]
            .into_iter()
            .map(|(journey, run)| {
                let target = registry.reserve(
                    authority(journey, run),
                    FakeProvider { secret: journey.into() },
                ).unwrap();
                registry.attach_child(&target, FakeChild::default()).unwrap();
                target
            })
            .collect::<Vec<_>>();

        let handles = registry.running_child_handles();
        assert_eq!(
            handles.iter().map(|(target, _)| target.journey_id.as_str()).collect::<Vec<_>>(),
            vec!["a", "b", "c", "d"],
        );
        assert_eq!(handles.len(), 4);

        registry.terminalize(&targets[1], TerminalState::Completed);
        let handles = registry.running_child_handles();
        assert_eq!(handles.len(), 3);
        assert_eq!(
            handles.iter().map(|(target, _)| target.journey_id.as_str()).collect::<Vec<_>>(),
            vec!["b", "c", "d"],
        );
    }

    // CR139 item 7. The Rust registry and the renderer's validator are two independently written
    // rule sets that must agree on the same bytes. This emits a real inspection carrying two
    // sibling workspaces in one Journey, and `piInvocationInspectionConformance.test.ts` parses the
    // committed file and asserts it reaches `known` — not `unknown`, which is what the pre-CR138
    // validator produced for exactly this payload and which disabled the Composer app-wide.
    #[test]
    fn publishes_a_real_two_workspace_inspection_for_the_renderer_validator() {
        let mut registry =
            PiProcessRegistry::<FakeAuthority, FakeChild, FakeProvider>::production();
        let root = registry.reserve(
            workspace_authority("mirror-desktop", "nautilus-thread-mirror-desktop", "run-root"),
            provider(),
        ).unwrap();
        let conversation = registry.reserve(
            workspace_authority("mirror-desktop", "desktop-thread-mirror-desktop-18d5cf4842", "run-conversation"),
            provider(),
        ).unwrap();
        let elsewhere = registry.reserve(
            workspace_authority("ariad", "nautilus-thread-ariad", "run-ariad"),
            provider(),
        ).unwrap();
        registry.attach_child(&root, FakeChild::default()).unwrap();
        registry.attach_child(&conversation, FakeChild::default()).unwrap();
        // Left reserved-but-unattached on purpose, so the fixture carries more than one phase.
        let _ = elsewhere;

        let inspection = registry.inspect();
        assert_eq!(inspection.entries.len(), 3);
        assert_eq!(
            workspace_pairs(&inspection),
            vec![
                ("ariad", "nautilus-thread-ariad"),
                ("mirror-desktop", "desktop-thread-mirror-desktop-18d5cf4842"),
                ("mirror-desktop", "nautilus-thread-mirror-desktop"),
            ],
        );
        let mut rendered = serde_json::to_string_pretty(&serde_json::json!({
            "note": "Emitted by PiProcessRegistry::inspect with two sibling workspaces in one Journey. Do not edit by hand; see CR139. Regenerate with CR139_WRITE_FIXTURE=1.",
            "inspection": inspection,
        })).unwrap();
        rendered.push('\n');
        let path = std::path::Path::new(env!("CARGO_MANIFEST_DIR"))
            .join("../src/tests/fixtures/piInvocationTwoWorkspaceInspection.json");
        if std::env::var("CR139_WRITE_FIXTURE").is_ok() {
            std::fs::create_dir_all(path.parent().unwrap()).unwrap();
            std::fs::write(&path, &rendered).unwrap();
            return;
        }
        let committed = std::fs::read_to_string(&path).expect(
            "the CR139 conformance fixture is missing; regenerate with CR139_WRITE_FIXTURE=1",
        );
        assert_eq!(
            committed, rendered,
            "the committed CR139 inspection fixture is stale: the registry's output changed. \
             Regenerate with CR139_WRITE_FIXTURE=1 and let the TypeScript conformance test \
             re-check the validator against it.",
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
