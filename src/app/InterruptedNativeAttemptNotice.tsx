export function InterruptedNativeAttemptNotice() {
  return (
    <section className="dedicated-turn-notice interrupted-native-attempt-notice" role="status" aria-live="polite">
      <strong>Previous attempt was interrupted</strong>
      <p>It ended before producing a response. No retry was started. You can continue by sending a new message.</p>
    </section>
  );
}
