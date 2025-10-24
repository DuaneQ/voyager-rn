export async function waitForDisplayed(selector: string, timeout = 5000) {
  const el = await $(selector);
  await el.waitForDisplayed({ timeout });
  return el;
}
