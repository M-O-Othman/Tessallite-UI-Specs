# Viewer browser verification

Status: blocked on the Browser plugin connection, 2026-09-07.

Card-icon/static-text follow-up: browser selection was retried on 2026-09-07
at 14:46 local time. Selection reported `No browser is available`; supported
discovery returned an empty list. Automated export checks pass, but desktop
and narrow-width rendering of icons and longer text still needs this connection.

The Chrome extension is installed and enabled. Its native-host manifest is
missing at `/home/oz/.config/google-chrome/NativeMessagingHosts/com.openai.codexextension.json`.
The browser runtime reports no connected browser.

Required action: reinstall the Browser plugin from the ChatGPT plugin UI,
then reconnect Chrome. Installing only the Chrome extension did not create
the native connection. No application or repository change can repair that
transport.

The [Browser skill](/home/oz/.codex/plugins/cache/openai-bundled/browser/26.818.31338/skills/control-in-app-browser/SKILL.md)
requires: “Only the Node REPL `js` tool can be used to control the selected
browser.” Its Chrome troubleshooting instructions explicitly say not to
install or repair the native host manually, and direct repair through the
plugin UI. Browser checks remain required; DOM tests do not replace them.

After reconnection, verify the generated viewer with the private Excel
document at desktop and narrow widths, in light and dark themes. Check
initial readability, card labels, expansion, scope switching, handler
search, breadcrumbs, event targets, drag/zoom, keyboard controls, file
selection and visible error recovery. Record screenshots and console
results outside this repository because the document is private.

This is an outstanding verification task, not an approved deferral.
