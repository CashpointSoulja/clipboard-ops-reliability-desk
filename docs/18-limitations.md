# Limitations

- **Not affiliated with Clipboard.** The concept has no access to Clipboard systems, data or internal knowledge. The architecture (ledger, projection, webhook) is an assumption.
- **Synthetic data and simulated connectors only.** The fault injection is deterministic: a transient 503 on SH-2204 and a persistent 503 on SH-2206 until it's cleared.
- **Simulated clock.** Times advance by fixed steps per action, so freshness and backoff are deterministic and not real waits.
- **Browser-only state.** One user and one browser. The role switch is a demo control, not authentication. The audit log can be edited by the user.
- **Classification is a fixed table.** Unmapped symptoms are not inferred.
- **One playbook.** Status re-sync only. No side-effect analysis.
- **No real webhook receiver.** Signature verification is specified, not implemented.
- **No measured value.** The metrics in the app are synthetic counts. There is no baseline and no ROI claim.
- **No interviews.** Personas, 5 Whys and RICE are hypotheses.
- **Accessibility:** automated checks and keyboard checks only. No screen-reader user testing. See [accessibility](testing/accessibility.md).
- **Fonts:** ppNeueMontreal (proprietary) is replaced by Work Sans.
