# Everstead design QA

final result: passed for the original scene adaptation; completion release addendum below

## Completion release addendum · 22 October 2026

The new two-part HUD, market panel and seasonal ambition entry were checked in the live local preview on iPhone and Pixel 10. On Pixel, all four Town, Colony, Frontier and Research tabs render within the preserved device shell; each primary action is visible above the persistent controls. Town now extends its green context background into the spare height on a tall Pixel viewport. The Market sheet exposes five demand sectors, current buy/sell prices and regional competition; Chronicle shows the current seasonal goals and claim controls. A fresh reload retained the day-5 settlement, active research and expeditions. Browser screenshots were observed during this pass; the comparison images listed below belong to the initial adaptation and are not represented as screenshots of this release.

The completion engine suite covers market phases, story follow-ups, encounter variants, rotating goals and corrupt-save recovery. Three legal scripted campaigns reached the Great Beacon on day 107 for seeds 17, 314 and 919, without injecting resources. Those automated journeys establish reachability under one strategy; they are not a claim that a human has played for days or that authored content is endless. Browser-local save persistence is not cross-device sync.

After the user identified a Realme GT Neo 3T as their device, the browser view was adapted to occupy a real phone viewport without a preview bezel or simulated system bars. A temporary 360 × 800 CSS-pixel iframe, matching the display's 20:9 aspect ratio at a plausible Android scaling, showed Town with the primary action and all persistent controls visible. Its Build sheet was checked open and scrollable. This is a viewport simulation, not a physical Realme hardware test; Android display-size and browser settings can alter CSS pixel dimensions. The temporary harness is not part of the release.

## Visual truth and scope

The user's final direction is to keep all three original designs equally, each for a different situation, and permit additional event scenes. This is an interactive adaptation of those three concepts, not a pixel-identical static mock. No concept is a master design. The rejected combined revision was not used as visual truth.

Selected source images, retained as normalized evidence in `docs/qa/*-source.jpg`:

- Town: `/workspace/scratch/d7b34357f94e/generated_images/exec-cd84b0a6-868a-4e6b-a401-ff9904c5a9ee.png`
- Colony: `/workspace/scratch/d7b34357f94e/generated_images/exec-530fa5af-3854-4c7a-8659-540e7dddb2b4.png`
- Frontier: `/workspace/scratch/d7b34357f94e/generated_images/exec-d995d46e-e4b4-4eb8-ad14-58c32d7b64b9.png`

All source images are 853 × 1844 pixels. They were normalized to 393 × 852 using Lanczos resampling (aspect difference below 0.3%). Implementation was rendered in the cloud browser at `http://terminal.local:4173/`. A temporary 1400 × 1200 iframe stage allowed the protected iPhone runtime to measure exactly 393 × 852 CSS pixels at scale 1. Browser screenshots were 1400 × 1200 pixels; crops at x=504, y=174 produced 393 × 852 implementation images. No image stretching or resampling was applied to those implementation crops. Pixel 10 measured 427 × 952 CSS pixels; its crop is x=487, y=124, width=427, height=952.

Evidence:

- Full comparisons, with source and implementation in the same image: `docs/qa/town-comparison.jpg`, `docs/qa/colony-comparison.jpg`, `docs/qa/frontier-comparison.jpg`.
- Focused context/typography/navigation comparisons: `docs/qa/town-detail.jpg`, `docs/qa/colony-detail.jpg`, `docs/qa/frontier-detail.jpg`.
- Android: `docs/qa/pixel-screen.jpg` and `docs/qa/pixel-panel.jpg`.
- Three playable views: `docs/preview.jpg`.

State: paused, day 5, Spring, 8 residents, 6 buildings, 2 expedition teams away. Town shows the district overview, Colony shows Mara, Frontier shows Whispering Grove with the careful route selected. The concepts show day 12 and selected construction/workplace/Archive actions; their static sample values and specific selection states are intentionally replaced with real game state. The source Archive is technology-gated in the live game. The screenshots therefore support composition/style review, not an exact-state pixel-diff assertion.

The template-owned status bar, safe areas, camera, bezel, navigation bar and device picker are preserved, and excluded from app fidelity judgments. Runtime integrity passed for all 28 protected files. The temporary QA harness is removed from the final build.

## Findings and comparison history

No remaining actionable P0/P1/P2 findings in the tested first-version scope.

1. [Resolved P2] Colony art was cropped too aggressively in the shallow scene. The portrait asset lost rooms/surface. A new 1391 × 1131 asset was composed for the 393 × 320 slot, with all six rooms visible. Room labels were realigned. Final evidence: `colony-comparison.jpg`.
2. [Resolved P2] Main actions were pushed below the short iPhone content viewport. Scene heights and context spacing were adjusted; expedition resident selection moved to its own preparation sheet. All three primary actions now fit above the persistent time/navigation controls. Secondary content remains scrollable. Final evidence: all three full comparisons.
3. [Resolved P2] Town context colors had drifted toward the paper theme. Dark green context/nav and gold accents were restored. Final evidence: `town-comparison.jpg` and `town-detail.jpg`.
4. [Resolved P1] Focus could scroll the device screen down toward the hidden keyboard. App-level focus/view effects restore screen scroll without changing the protected runtime. View switches, sheet close, and device changes were checked with screen scrollTop 0.
5. [Resolved P2] The sheet close button used fixed positioning and escaped outside the phone when the sheet animation completed. It now stays inside the sheet content using sticky positioning. Final evidence: `pixel-panel.jpg`.
6. [Resolved usability issue] Panel errors were hidden behind the modal. Feedback is now rendered inside open panels; the two-expedition capacity message was observed after a third launch attempt.

An automation-specific issue affected some frame-scoped locator clicks. Visible accessibility-target clicks worked for selection, launching, navigation and dismissal. Resident selection was checked on Android with two sequential pointer clicks, both showing selected state; launch capacity feedback was then verified. No unresolved tap failure was observed with that path.

## Required fidelity surfaces

- **Fonts and typography:** Cinzel display brand and Lora body/headings reproduce the serif hierarchy. Text is live, not baked into illustrations. Full and focused comparisons show readable title/CTA wrapping. The reference's approximate display serif is not claimed to be an exact font match. Small resource/room labels retain compact density; increasing their optical size is a follow-up polish option.
- **Spacing and layout rhythm:** All three retain illustrated scene → contextual action → bottom navigation. Shared persistent time controls, protected safe areas and the six-resource HUD require shorter scenes than the static concepts. This is an explicit functional adaptation. Primary actions remain visible; secondary crafting/trip rows are scrollable. Android benefits from its taller screen. No horizontal overflow or persistent-control occlusion observed.
- **Colors and tokens:** Town uses dark green/gold, Colony navy/amber with cream resident details, Frontier parchment/teal. They remain visibly distinct. Selected locations, tabs, routes and residents use both state styling and semantic attributes. No generated gradient replacement or CSS illustration is used.
- **Image quality and assets:** Real generated raster assets preserve the original pastoral/isometric, cutaway and illustrated-atlas subjects. Six rooms and the resident portrait are sharp at intended size. Standard controls use Phosphor icons. Art remains illustrative; actual construction is represented by district/building lists, rather than implying a changing tile map. The extra storm illustration is used by relevant events.
- **Copy and content:** Resource values, staffing, travel times, production and effects come from live state. Shared labels Town/Colony/Frontier/Research replace inconsistent navigation names across concepts. All claimed headline interactions work. The guide explicitly explains illustrated scenes and browser-local saves. No franchise art/characters or false unlimited-content promises appear.

## Functional verification

Browser playthrough covered:

- Build a cottage and observe costs/capacity.
- Assign Mara to a workplace; changes reflect across views.
- Prepare and send an expedition; resolve a midway encounter.
- Start research, advance days and resolve a town event using the free choice.
- Send a second expedition, verify both teams and food cost, then reject a third with visible feedback.
- Switch Town/Colony/Frontier/Research; open/close sheets.
- Restore the day-5 game after a fresh page reload.
- Check the iPhone and Pixel 10 layouts and Pixel resident-selection controls.
- Open the new-settlement confirmation and cancel. Final reset was blocked by automatic approval review; current playtest progress was retained.

Fresh-load console check found no application errors. One browser-extension metadata error was unrelated to the app. Earlier development HMR errors were not present after the fresh load.

Engine tests cover deterministic simulation, finite bounded stocks over 40 seeds × 240 days, resource and technology gates, staffing/travel exclusivity, free event choices, seasonal effects, non-arbitrage trades, one-time rewards, workshop input starvation, and save validation/roundtrip. These are automated simulations, not human balancing sessions. End-to-end progression through the final Beacon has not been human-playtested. Native export/import transfer between real phones is not claimed tested; save serialization and reload were verified.

## Follow-up polish and limits

- [P3] Small secondary labels could use a larger optical font on small real phone displays.
- [P3] The next partially visible crafting/trip row is scrollable; a subtle scroll affordance may make this clearer.
- Finite authored events and a simplified neighbour model need player feedback for long-session balance and variety.
- No moving villagers, free-form roads, 3D combat or independent city AI is claimed.

## Implementation checklist

- [x] Preserve all three equal designs and an additional storm scene.
- [x] Replace scene placeholders with generated assets.
- [x] Connect shared simulation, resident assignments, research, expeditions, decisions and saves.
- [x] Fix and recapture all observed P1/P2 visual issues.
- [x] Inspect full and focused side-by-side evidence.
- [x] Test primary actions and a fresh save reload in the cloud browser.
- [x] Preserve protected mobile runtime; keep the verified local preview available.

final result: passed
