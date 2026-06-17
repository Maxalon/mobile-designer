# mobile-designer

Repo for building small **drag-and-drop UI design APKs** — offline Android tools
where you arrange a real UI's pieces on a canvas, then export the layout to share
and iterate on.

Each tool is a self-contained folder: a Vite/Vue WebView bundle + a minimal
Android WebView host, built into an APK by GitHub Actions (the artifact is
downloadable from each run).

## Tools

### [`board-designer/`](board-designer/) — Virtual-engine board layout designer

Compose the play-board layout: drag / resize / add / remove board regions
(battlefield, hand, pile rail, control row, opponent board, …) on a fixed
landscape canvas with edge + neighbour snapping and overlap prevention, then
export a proposal as **JSON + PNG** via the system share sheet (and import others'
to compare/tweak). Renders the genuine board components for exact fidelity; card
art comes from Scryfall's public API and is cached for offline use. See
[`board-designer/README.md`](board-designer/README.md).

## Building

CI builds each tool's web bundle (with unit tests) and assembles a debug APK on
`ubuntu-latest`, uploading the APK as a workflow artifact — so you (and anyone
who forks this public repo) can grab a build with no local Android setup.

To build locally, see the tool's own README.
