# Walkthrough video: source script

**Format:** vertical 1080×1920, 30 fps, H.264 + AAC, 121.6 s. It is a continuous live recording of the running app, not a slideshow. The cursor is a visible yellow-and-burgundy ring that shrinks on click. There are two restrained zooms (scale 1.1) on the row errors and on one case's gates.

**Credits:** concept by Ayo Ahmed. Independent concept, not affiliated with Clipboard. All data is synthetic.

**Pipeline (all local, no paid services):**
1. `docs/video/scenes.json` holds the per-scene voiceover text.
2. The voiceover is synthesised locally with the open-source Piper TTS (voice `en_US-lessac-medium`). Each clip's duration is measured with `ffprobe`.
3. `scripts/record-walkthrough.mjs` drives the real UI at 540×960 CSS px with a 2× device scale. It holds each scene for at least its voiceover length, records each scene's start time, and captures frames over the Chrome DevTools screencast.
4. `scripts/build-video.py` converts the frames to 30 fps. It places each voiceover clip at its recorded scene start and splits subtitles by sentence within each scene, in proportion to text length. It writes [`walkthrough.srt`](walkthrough.srt), burns the subtitles in, and strips encoder metadata. The title is set to "Ops Reliability Desk walkthrough (independent concept by Ayo Ahmed, not affiliated with Clipboard)" and the artist to "Ayo Ahmed".

## Scenes (start times from the actual recording)

| Scene | Starts | Title | VO length | Voiceover / subtitle text |
|---|---|---|---|---|
| s01 |   0.2s | Intro | 13.26s | This is Ops Reliability Desk, an independent concept by Ayo Ahmed. It is not affiliated with Clipboard. Every case is synthetic, every connector is simulated, and state lives only in this browser. |
| s02 |  14.0s | Malformed upload | 9.3s | First, a bad file. Validation is deterministic and atomic. Each row error names the column, the code and the fix, and nothing is imported. |
| s03 |  24.2s | Sample upload | 9.22s | Now the sample export: seventeen synthetic cases from workplaces and workers. Eleven describe the same symptom. Shift status is not updating. |
| s04 |  34.1s | Owned incident | 6.34s | Deterministic rules group them into one owned incident, linked to the shift events webhook that failed ten times. |
| s05 |  41.7s | Evidence | 8.53s | Each case shows the source of truth beside the displayed status, data freshness, the affected workflow, the next step, and six risk gates. |
| s06 |  52.5s | Refusal | 11.43s | Here is a refusal. One case has no shift ID. Another's source is six hours old. The desk will not repair either one. It hands them to the on-call role, with context. |
| s07 |  64.6s | Approve | 7.39s | The operator approves one reversible re-sync. Evidence is read again first, and only shifts that pass every gate are written. |
| s08 |  72.5s | Retry and dead-letter queue | 9.79s | Every write carries an idempotency key. One shift recovers on retry. Another fails three times and moves to the dead-letter queue. Nothing is half applied. |
| s09 |  83.0s | Recovery | 7.9s | Verification fails while the queue is open. Once the simulated upstream recovers, replay applies the same key exactly once. |
| s10 |  95.6s | Verify and resolve | 7.16s | A fresh read now matches six of six, so the incident is resolved, and exported as a spec and a regression case. |
| s11 | 105.4s | Human handoffs | 6.96s | Billing, credential and trust cases are never auto-decided. They go to named specialist roles, and no money moves. |
| s12 | 113.1s | Close | 7.29s | Metrics here are illustrative synthetic counts, not claims about real results. Reset restores the sample at any time. |
