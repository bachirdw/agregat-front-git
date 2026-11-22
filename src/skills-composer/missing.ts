/** Fields and capabilities pictured by the mockups but absent from the current API.
 * Keep this single boundary empty until an actual backend contract supplies them.
 */
export function readMissingField<T>(_name: string): T | undefined {
  return undefined;
}
