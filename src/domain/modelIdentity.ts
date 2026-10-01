/**
 * CR103: the Composer footer read as operational notation because it showed the full
 * `provider/model` binding, or hid the model entirely behind a Model Intent label. The Navigator
 * needs the model named in a register they can scan, with the exact binding still reachable.
 */

/**
 * The model name without the provider that qualifies it.
 *
 * This is the exact inverse of `providerModelLabel`, which joins `${provider}/${model}`, so the cut
 * is at the FIRST separator rather than the last: a provider can expose provider-prefixed model
 * names such as `openrouter/openai/gpt-4`, where cutting at the last separator would silently drop
 * `openai/` and name a different model.
 */
export function bareModelName(providerModel: string): string {
  const separator = providerModel.indexOf("/");
  return separator === -1 ? providerModel : providerModel.slice(separator + 1);
}

/**
 * Bare names that more than one provider claims. Abbreviating those would trade a hard-to-read
 * name for an ambiguous one, so they keep their provider.
 */
export function ambiguousBareModelNames(
  catalog: readonly { provider: string; model: string }[],
): ReadonlySet<string> {
  const providersByName = new Map<string, Set<string>>();
  for (const entry of catalog) {
    const providers = providersByName.get(entry.model) ?? new Set<string>();
    providers.add(entry.provider);
    providersByName.set(entry.model, providers);
  }
  const ambiguous = new Set<string>();
  for (const [name, providers] of providersByName) {
    if (providers.size > 1) ambiguous.add(name);
  }
  return ambiguous;
}

/** The name to show for a binding: bare where that is unambiguous, qualified where it is not. */
export function modelDisplayName(
  providerModel: string,
  ambiguous: ReadonlySet<string>,
): string {
  const bare = bareModelName(providerModel);
  return ambiguous.has(bare) ? providerModel : bare;
}
