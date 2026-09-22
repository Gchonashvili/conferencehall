/**
 * A field real people never see or fill. Bots that auto-fill every input give
 * themselves away; the server pretends success and drops the submission.
 */
export function Honeypot() {
  return (
    <div aria-hidden className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
      <label>
        Website
        <input type="text" name="website" tabIndex={-1} autoComplete="off" />
      </label>
    </div>
  );
}
