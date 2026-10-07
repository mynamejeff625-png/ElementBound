# The Bender's Tome: How to Play content

This is the approved content and page format for the How to Play book (phase 2e).
It replaces the modal-based `showRules()` / `HELP_SECTIONS` help. The look and
motion follow the canvas mockup "How to Play · The Bender's Tome" and
`docs/DESIGN.md` §7. This file is the source for every page's words. Code tasks
(2e-1, 2e-2) move this content into data. They do not rewrite it.

## 0. Format rules

### 0.1 The book
- **Cover:** "The Bender's Tome", with the subtitle *Lessons & Glossary* and an
  "Open the Tome" button.
- **Part One · First Lessons:** seven short lessons, each with a playable demo.
- **Part Two · The Glossary:** Core Terms & Symbols, Effects at a Glance, The Nine
  Elements index, then one chapter per element in Trials-map order: Fire, Water,
  Earth, Nature, Lightning, Air, Magma, Bloom, Storm.
- **Thumb tabs** on the right page edge: Contents/First Lessons (book icon), Core
  Terms (sword), then the nine element medallions, with a small gap between Primes
  and Hybrids. The current chapter's tab slides out 5px and gets
  `aria-current="page"`. Tabs are 44px tall.
- **Bottom navigation:** ‹ and › buttons, plus a label like "Water · 7".
- **Pages:** a phone shows one page and a wide screen shows a two-page spread.
  Swipe follows the finger. Reduced motion replaces the flip with a 150ms
  cross-fade.

### 0.2 Page anatomy (every glossary page, same order)
1. **Label:** for example `GLOSSARY · FIRE` (9px, uppercase, bronze).
2. **Icon + title:** a status or UI glyph, or a medallion for element pages.
3. **Archivist line:** italic Cormorant Garamond (Owner-approved 2026-10-05,
   self-hosted with its OFL file).
4. **Rule:** plain Nunito Sans. This is the rules text and must match the game.
5. **Quick facts strip** (effect pages only; see 0.3).
6. **Demo:** a small looping or tap-to-play illustration built from symbols.
7. **Don't confuse with:** only where listed.
8. **Seen on:** card chips, which open the shared card zoom.
9. **See also:** term chips, which flip to that page.
10. **Try it:** a button that opens the matching Trial. Leave it out when no Trial
    exists.

Sections with no content are left out. Their spacing is not reserved.

### 0.3 Quick facts strip
Three icon badges in a row, always in this order. Each badge has a visible text
value, so the meaning never relies on colour.

| Badge | Values |
|---|---|
| **On** | Manifestation · Bender · Manifestation or Bender · Your turn · Your deck |
| **Lasts** | Instant · Next attack · Until used · Until used or round end · Round end · Until your next turn · While on field · Until destroyed · Stays · This turn · Each draw |
| **Stacks** | No · No (1 per round) · Up to 3 · Counts up · 3 uses |

### 0.4 Links and the back trail
- In this file, `[[Term]]` marks a link. Every Element Bound term inside rule text
  is written that way and renders as a dotted-underline button that flips to the
  term's page.
- Following a link pushes the current page onto a trail. A small ribbon "‹ Back to
  <page>" appears at the top of the page. Tapping it flips back one step. Following
  a contents link, a tab or an index link clears the trail. The trail holds at
  most 10 entries.
- Card names in **Seen on** open the card zoom, not a page.

### 0.5 The Archivist's voice
- The Archivist states one true thing a new player would not have noticed. Each
  line is one or two sentences, with no more than 25 words in total.
- No direct address ("Bender…"), no "young one", no prophecy, no exclamation
  marks.
- The line must not repeat the rule. It adds a reason, a timing, or a warning.
- One image is allowed when it is concrete ("the wind takes it back").
  Abstractions are not ("destiny", "the flame within").


### 0.6 Search words from other games
The search in the Tome header matches titles first, then these words players bring from other card games, then words inside the Archivist lines and rules. A word may point to more than one page.

| Page | Also found by |
|---|---|
| Essence | mana, energy, gold |
| Vitality | life, life total, hit points |
| Health ♡ | hp, health, toughness |
| Wake | graveyard, grave, discard pile, discard |
| Deck | library, draw pile |
| Guard | taunt, tank, wall, shield, protect |
| Armor | block, shield, damage reduction |
| Manifestation | creature, minion, unit, monster, summon |
| Technique | spell, sorcery, action card |
| Response | counter, trap, reaction, instant, interrupt |
| Burning | burn, poison, damage over time, dot |
| Soaked | slow, wet, freeze |
| Growth | buff, pump, grow |
| Momentum | buff, haste, speed |
| Weakened | debuff, weaken |
| Flow | scry, look at top, draw filter |
| Exhaustion | fatigue, deck out, empty deck |
| Card Depletion | mill, decked, lose by cards |
| Card Re-cycle | mulligan, redraw, swap card |
| Summoning sickness | summon sick, sick, cannot attack |
| Warded | rally ward, ward, protected, cannot be attacked |
| Attack ⚔ | atk, attack, power, damage |
| Initiative | coin flip, who goes first, first player |
| Chain | combo, sequence, storm count |
| Resonance | combo, hybrid bonus, dual element |

---

## Part One · First Lessons

Each lesson is one page with: label, title, Archivist line, at most 3 short rule
lines, and one demo. The rule lines link their terms. The demo's speech line sits
under it in the narrator font.

### I · Your Bender
- **Archivist:** "Cards come and go all duel. Your Bender is the one thing you cannot replace."
- **Rules:** You are a [[Bender]] with 30 [[Vitality]]. Bring the rival's Vitality to 0 to win. If yours reaches 0, you lose.
- **Demo:** Two Bender plates show ♡ 30. Tap the rival plate: ♡ drops 30 → 27 and "−3" floats up.
- **Demo says:** "Tap the rival." → "That is the whole goal. Everything else is how."

### II · Cards & Essence
- **Archivist:** "You will always want one more Essence than you have. Choosing what to leave in your hand is the real skill."
- **Rules:** Cards cost [[Essence]], shown in the gem. You start with 2 and gain 1 more each round, up to 7. Essence refills at the start of your turn.
- **Demo:** An Essence bar with 3 gems and a hand of costs 1, 2 and 3. Tapping a card spends its gems. A card you cannot afford dims.
- **Demo says:** "Spend 3 Essence." → "Full. Anything left waits for next turn."

### III · The Field
- **Archivist:** "A Manifestation cannot strike on the turn it arrives. Summon it early, so it is ready when you need it."
- **Rules:** [[Manifestation]]s fill your three [[Field Slot]]s and fight with ⚔ and ♡. [[Technique]]s resolve once and go to the [[Wake]]. New Manifestations have [[Summoning sickness]].
- **Demo:** Drag a Manifestation into an empty slot. Its ⚔ shows a small hourglass until "next turn" is tapped, then it glows Ready.
- **Demo says:** "Summon it." → "It waits one turn." → "Now it can attack."

### IV · Effects & Combos
- **Archivist:** "Most cards are stronger second. The skill is knowing which one goes first."
- **Rules:** Set up an [[Elemental effect]], then play the card that rewards it.
- **Demo:** Tap Cinder Adept, and the rival gains [[Burning]]. Then tap Flame Burst, and "−3" appears instead of −2. This is the demo built in the mockup.
- **Demo says:** "Tap the glowing card." → "Burning is set. Now cash it in." → "3 damage instead of 2. That is a combo."
- **Try it:** Trial of Flame

### V · Defense & Responses
- **Archivist:** "The best defense is chosen before the attack. Guard and Armor are already in place; a Response is your last word."
- **Rules:** [[Guard]] keeps attacks off your Bender. [[Armor]] blocks damage to one Manifestation. When you are attacked, a [[Response Window]] lets you play one [[Response]] or [[Pass]].
- **Demo:** A rival attacker moves toward your Bender, and the Guard shield blocks it. It moves toward a Manifestation instead: the Response Window slides up with "Stonewall" and "Pass". Tap Stonewall, an Armor pip appears, and the damage drops by 1.
- **Demo says:** "Guard holds the Bender." → "Answer the attack." → "Armor took the first point."

### VI · Hybrids & Resonance
- **Archivist:** "A Hybrid deck is two decks pretending to be one. It only becomes Hybrid when you play both halves in the same turn."
- **Rules:** A [[Hybrid]] deck mixes two [[Prime]] elements. Play one Prime card from each parent in the same turn to start [[Resonance]], and your Hybrid cards get stronger.
- **Demo:** Two half-rings: a Fire medallion and an Earth medallion. Tap a Fire card to fill the left half, then an Earth card to fill the right. The ring closes and the Magma medallion lights up with "Resonance".
- **Demo says:** "Play a Fire card." → "Now an Earth card." → "Resonance. Magma's cards wake up."

### VII · When the Cards Run Out
- **Archivist:** "Long duels are lost in the deck, not on the field. Count your cards before you spend them."
- **Rules:** If you must draw from an empty [[Deck]], you suffer [[Exhaustion]]: 2 damage the first time, then 3, then 4, growing each time. Running out of cards never ends the duel by itself, so your field can still win it. [[Card Re-cycle]] swaps a card you cannot use, 3 times per match.
- **Demo:** A deck counter ticks 1 → 0, a draw arrow hits the empty deck, and ♡ drops by 2. The next empty draw drops it by 3, and an "Exhaustion grows" seal stamps down.
- **Demo says:** "Empty deck: 2 damage." → "Again: 3 damage. It keeps growing."

---

## Part Two · The Glossary

Entry fields: **Label · Icon · Archivist · Rule · Quick facts · Demo · Don't confuse · Seen on · See also · Try it**.

### Contents page
- **Archivist:** "Every page here was paid for by someone who lost a duel. Read it, and the lesson costs you nothing."

### The Nine Elements (index page)
- **Archivist:** "Six elements stand alone. Three only exist where two of them meet."
- **Layout:** a 3 × 3 medallion grid in two groups, *Prime* (Fire, Water, Earth, Nature, Lightning, Air) and *Hybrid* (Magma, Bloom, Storm). The hint below reads "Tap an element, or use the tabs on the page edge."

---

## Chapter · Core Terms & Symbols

Tab icon: sword. Pages follow this order.

#### Attack ⚔ (symbol)
- **Archivist:** "Read the sword before the card text. It tells you what is coming next turn."
- **Rule:** The number beside the sword is a [[Manifestation]]'s attack (ATK): the damage it deals when it attacks.
- **Demo:** A ⚔ 3 plate, then "=", then "deals 3 when it attacks".
- **See also:** [[Health ♡]], [[Momentum]], [[Growth]], [[Weakened]]

#### Health ♡ (symbol)
- **Archivist:** "Damage does not heal by itself. A wounded Manifestation still hits at full strength until its last point."
- **Rule:** The heart shows a Manifestation's current health (HP). Damage lowers it. At 0 the Manifestation is destroyed and goes to the [[Wake]]. On a Bender, the heart shows [[Vitality]].
- **Demo:** A ♡ 5 plate takes −3 and shows 2. It takes −2 more and the card fades to the Wake.
- **Don't confuse with:** [[Vitality]], your Bender's life. Vitality decides the duel; HP decides one Manifestation.
- **See also:** [[Armor]], [[Attack ⚔]]

#### Essence ◆ (symbol)
- **Archivist:** "Unspent Essence does not carry over. A turn that ends with gems left over was a turn half played."
- **Rule:** The gem on a card is its [[Essence]] cost. Your gems along the bottom show what you can spend this turn.
- **Demo:** A card with gem 2 is tapped, and two of three gems dim.
- **See also:** [[Essence]], [[Turn]]

#### Bender
- **Archivist:** "Every rule in this book exists to protect one plate: yours."
- **Rule:** That is you, the player you are protecting. If your [[Vitality]] reaches 0, you lose the duel.
- **See also:** [[Vitality]], [[Guard]]

#### Vitality
- **Archivist:** "Thirty is less than it looks. A full field can take a third of it in one turn."
- **Rule:** Your Bender's life total. You begin a normal duel with 30. Damage lowers it, and some effects restore it. Reach 0 and that Bender loses.
- **Don't confuse with:** [[Health ♡]], which belongs to a single Manifestation.
- **See also:** [[Bender]], [[Exhaustion]]

#### Essence
- **Archivist:** "Two on the first turn, seven at the most. The early turns reward cheap cards; the late turns reward the right card."
- **Rule:** The energy you spend to play cards. You start with 2 and your maximum grows by 1 each round, up to 7. It refills at the start of your turn.
- **See also:** [[Essence ◆]], [[Round]]

#### Manifestation
- **Archivist:** "A creature on the field is a threat your rival must answer every turn it survives."
- **Rule:** A creature you summon into one of your three [[Field Slot]]s. Manifestations have ⚔ and ♡, can attack, and can carry [[Elemental effect]]s.
- **Don't confuse with:** [[Technique]], which resolves once and leaves.
- **See also:** [[Summoning sickness]], [[Ready]]

#### Technique
- **Archivist:** "A Technique is gone the moment it works. Make sure it works."
- **Rule:** A one-use action card. Pay its Essence, resolve its effect, and it goes to the [[Wake]] instead of staying on the field. Each Prime deck carries two different Techniques.
- **See also:** [[Quick]], [[Target]]

#### Response
- **Archivist:** "A Response is cheap, quick, and only works in one moment. Miss that moment and it is just a card in your hand."
- **Rule:** A reactive card used only during a [[Response Window]]. Responses cost 2 Essence, resolve once, then go to the [[Wake]]. Each element has one: Backdraft, Undertow, Second Bloom, Stonewall, Flash Step and Slipstream.
- **Don't confuse with:** [[Quick]], which you set up on your own turn.
- **See also:** [[Pass]], [[Initiation Token]]

#### Response Window
- **Archivist:** "The game stops and asks you a question. Most of the time, the right answer is the one your rival didn't plan for."
- **Rule:** A short pause created when an enemy attack qualifies. You may play one legal [[Response]] or [[Pass]]. The attack is then checked again and continues only if it is still legal. Online, you have 10 seconds to choose, and your rival's turn clock pauses meanwhile. With Auto-pass on, the Initiation Token alone never opens a window.
- **Demo:** An attack arrow freezes mid-flight. The window rises with one Response card and Pass, and a 10-second ring counts down.
- **See also:** [[Response]], [[Pass]]

#### Pass
- **Archivist:** "Passing is a choice too. Save the Response for the attack that matters."
- **Rule:** Decline the current Response opportunity. The attack continues if it is still legal.
- **See also:** [[Response Window]]

#### Initiation Token
- **Archivist:** "Going second costs you a turn. The token is the game paying you back."
- **Rule:** A one-use resource given to the Bender who goes second. It lets you play an eligible elemental [[Response]] without having that card in your [[Hand]]. A [[Hybrid]] Bender's token can call either parent element's Response.
- **Quick facts:** On: Bender · Lasts: Until used · Stacks: No
- **See also:** [[Initiative]], [[Response Window]]

#### Initiative
- **Archivist:** "The coin decides who strikes first. It does not decide who strikes last."
- **Rule:** The gold coin at the start of a duel decides who takes the first turn. The other Bender receives the [[Initiation Token]].
- **See also:** [[Turn]], [[Initiation Token]]

#### Turn
- **Archivist:** "Build, then strike, then stop. Ending a turn early is how good Benders keep cards for later."
- **Rule:** Your chance to play cards, set up effects and attack with [[Ready]] Manifestations. At the start of your turn your Essence refills and you draw 1 card. Then control passes to the rival.
- **See also:** [[Round]], [[Chain]]

#### Round
- **Archivist:** "Anything that says 'round end' is borrowed. Spend it before your rival's turn is over."
- **Rule:** One round is complete once both Benders have taken a turn. Effects that last until "round end" ([[Armor]], [[Momentum]], [[Charged]]) disappear then, and your maximum [[Essence]] grows by 1.
- **See also:** [[Turn]], [[Effects at a Glance]]

#### Field Slot
- **Archivist:** "Three slots. A full field looks strong, but it leaves nothing to answer with."
- **Rule:** One of your three Manifestation spaces. A Manifestation needs an empty slot to enter. Some cards move Manifestations between slots.
- **See also:** [[Manifestation]], [[Storm]]

#### Hand
- **Archivist:** "The rival sees how many cards you hold, never which ones. Keep it that way."
- **Rule:** The cards you can play right now. Your rival's hand count is visible, but its cards stay hidden.
- **See also:** [[Deck]], [[Card Re-cycle]]

#### Deck
- **Archivist:** "Every card you draw is one fewer between you and Exhaustion."
- **Rule:** Your remaining draw pile. If it is empty when you need to draw, [[Exhaustion]] happens instead.
- **See also:** [[Flow]], [[Card Depletion]]

#### Wake
- **Archivist:** "Nothing returns from the Wake. Spend cards like they are gone, because they are."
- **Rule:** The used-card pile. Resolved Techniques, used Responses, re-cycled cards and destroyed Manifestations go here.
- **See also:** [[Technique]], [[Card Re-cycle]]

#### Card Re-cycle
- **Archivist:** "Three chances to trade a dead card for a live one. Use them early, while a better card can still change the duel."
- **Rule:** Select a card in your [[Hand]] and swap it for a random, different card from your [[Deck]]. You get 3 uses per standard match. It is not available in Trials.
- **Quick facts:** On: Your turn · Lasts: Stays · Stacks: 3 uses
- **See also:** [[Hand]], [[Wake]]

#### Summoning sickness
- **Archivist:** "New arrivals cannot strike, but a Guard still guards. Protection starts the moment a card lands."
- **Rule:** A Manifestation cannot attack on the turn it enters the field. Its passive effects, including [[Guard]], work immediately.
- **Quick facts:** On: Manifestation · Lasts: This turn · Stacks: No
- **See also:** [[Ready]]

#### Ready
- **Archivist:** "A Ready Manifestation is a question your rival has to answer before ending their turn."
- **Rule:** A Manifestation that can attack now. It is ready from your next turn after it enters, and again each turn after that.
- **See also:** [[Summoning sickness]]

#### Target
- **Archivist:** "The right target matters more than the biggest number."
- **Rule:** The Bender or Manifestation an attack or Technique is aimed at. When a choice is needed, the game highlights every legal target.
- **See also:** [[Guard]]

#### Warded
- **Label:** GLOSSARY · CORE TERMS · glyph `warded`
- **Archivist:** "A swept field gets one breath. Use it to put back something that can last."
- **Rule:** Rally Ward: from round 2 on, a Manifestation summoned onto your empty field while the rival has Manifestations is Warded. It can't be attacked until your next turn begins. Techniques can still target it, and a Warded [[Guard]] still protects your Bender.
- **Quick facts:** On: Manifestation · Lasts: Until your next turn · Stacks: No
- **Don't confuse with:** [[Guard]], which protects your Bender, not the Manifestation itself.
- **See also:** [[Target]], [[Summoning sickness]]

#### Elemental effect
- **Archivist:** "An effect does little on its own. It is a promise that a later card will keep."
- **Rule:** A visible mark such as [[Burning]], [[Soaked]], [[Seeded]], [[Growth]], [[Charged]], [[Momentum]], [[Armor]] or [[Weakened]]. Other cards check for these marks to gain bonuses.
- **See also:** [[Effects at a Glance]]

#### Prime
- **Archivist:** "A Prime deck does one thing very well. Learn the one thing."
- **Rule:** A deck or card aligned to one core element: Fire, Water, Earth, Nature, Lightning or Air.
- **See also:** [[Hybrid]], [[The Nine Elements]]

#### Hybrid
- **Archivist:** "A Hybrid deck asks for more planning and pays more for it."
- **Rule:** A deck that combines two [[Prime]] elements and adds its own Hybrid cards. Hybrid play is about turning on [[Resonance]].
- **See also:** [[Magma]], [[Bloom]], [[Storm]]

#### Resonance
- **Archivist:** "One card from each parent, same turn. Hybrid cards are built to wait for that moment."
- **Rule:** A Hybrid turn state. Resolve one Prime card from each of your Hybrid's two parent elements in the same turn to turn on Resonance. Hybrid cards do not count toward it, but many of them become stronger while it is on.
- **Quick facts:** On: Your turn · Lasts: This turn · Stacks: No
- **Demo:** Two half-rings fill one at a time, then close and glow. This is the demo from Lesson VI.
- **Don't confuse with:** [[Chain]], which counts cards in sequence. Resonance only needs one from each parent.
- **See also:** [[Hybrid]], [[Card roles]]

#### Quick
- **Archivist:** "A Quick card is a trap you set on your own turn. Your rival walks into it on theirs."
- **Rule:** A Technique that sets up an effect that lasts until your next turn. You commit to it in advance. It is separate from the [[Response Window]].
- **Quick facts:** On: Manifestation · Lasts: Until your next turn · Stacks: No
- **Don't confuse with:** [[Response]], which is chosen when an attack arrives.
- **Seen on:** Eruption Guard, Static Reversal, Reclaiming Tide
- **See also:** [[Card roles]]

#### Card roles
- **Archivist:** "Every Hybrid card has a job. Play them in job order and the deck plays itself."
- **Rule:** Hybrid cards show a role. **Setup** prepares an effect. **Payoff** cashes it in. **Avatar** is the deck's signature Manifestation. **Quick** guards the turn ahead.
- **Seen on:** Molten Channel (Setup), Pressure Forge (Payoff), Obsidian Ravager (Avatar), Eruption Guard (Quick)
- **See also:** [[Resonance]], [[Quick]]

#### Exhaustion
- **Archivist:** "The empty deck does not end you at once. It costs 2 Vitality, then 3, then 4, until something else does."
- **Rule:** If your [[Deck]] is empty when you would draw, your Bender takes Exhaustion damage instead: 2 the first time, then 1 more each time after (3, 4, 5…). The duel goes on.
- **Quick facts:** On: Bender · Lasts: Each draw · Stacks: Counts up
- **Don't confuse with:** [[Card Depletion]]: running out of cards does not end the duel.
- **See also:** [[Deck]], [[Flow]]

#### Card Depletion
- **Archivist:** "An empty hand is not a lost duel. Whatever is still on your field keeps fighting."
- **Rule:** Running out of cards does not end the duel. With an empty [[Hand]] and [[Deck]] you keep taking turns: your Manifestations still attack, and each draw becomes [[Exhaustion]], which grows every time. Only 0 [[Vitality]] ends the duel.
- **Don't confuse with:** [[Exhaustion]], the damage that replaces each draw from an empty Deck.
- **See also:** [[Exhaustion]], [[Vitality]]

---

## Chapter · Effects at a Glance

One page. It sits after Core Terms and is linked from every effect page's label.

- **Archivist:** "Ten effects decide most duels. Learn them here and you will read the field at a glance."
- **Table:** each row links to its page.

| Glyph | Effect | Element | What it does | Lasts | Stacks |
|---|---|---|---|---|---|
| burning | [[Burning]] | Fire | Fire payoffs hit harder | Stays | No |
| soaked | [[Soaked]] | Water | Next attack −2 | Next attack | No |
| armor | [[Armor]] | Earth | Blocks 1 damage | Round end | No (1 per round) |
| guard | [[Guard]] | Any | Shields the Bender | While on field | No |
| seeded | [[Seeded]] | Nature | Unlocks Growth | Stays | No |
| growth | [[Growth]] | Nature | +1 ⚔ each | Stays | Up to 3 |
| charged | [[Charged]] | Lightning | Next Lightning hit +1 | Until used or round end | No |
| momentum | [[Momentum]] | Air | +1 ⚔ each | Round end | Up to 3 |
| weakened | [[Weakened]] | Air | −1 ⚔ | Until destroyed | No |
| — | [[Flow]] | Water | Fix your next draw | Instant | — |

---

## Chapter · Fire

#### Fire (element page)
- **Label:** GLOSSARY · PRIME ELEMENT
- **Archivist:** "Fire wants the duel short. Every turn you give it, it uses."
- **Deck line:** **Blazing Fist** · PRESSURE · BURNING
- **Rule:** Aggressive damage and finishers. Apply [[Burning]], then hit the Burning target with Fire payoffs.
- **Techniques:** Flame Burst, Searing Brand
- **Response:** Backdraft: after an enemy damages one of your Manifestations, it deals 2 damage to the attacker.
- **In this chapter:** [[Burning]]
- **Hybrid:** [[Magma]] · with Earth
- **Try it:** Trial of Flame

#### Burning
- **Label:** GLOSSARY · FIRE · glyph `burning`
- **Archivist:** "Burning does nothing by itself. It marks who the next Fire card should hit."
- **Rule:** Fire's setup effect. Burning deals no damage on its own. Fire cards such as Flare Hawk and Flame Burst hit harder against a Burning target.
- **Quick facts:** On: Manifestation or Bender · Lasts: Stays · Stacks: No
- **Demo:** A rival plate with a breathing flame, showing "2 → 3".
- **Don't confuse with:** damage over time. Burning never ticks; only the payoff deals damage.
- **Seen on:** Cinder Adept, Flare Hawk, Flame Burst, Searing Brand, Molten Channel, Obsidian Ravager, Pressure Forge
- **See also:** [[Fire]], [[Magma]]
- **Try it:** Trial of Flame

---

## Chapter · Water

#### Water (element page)
- **Archivist:** "Water rarely wins the trade. It changes what the trade is worth before it happens."
- **Deck line:** **Shifting Tide** · CONTROL · SOAKED
- **Rule:** Flow and battlefield manipulation. Weaken the next attack with [[Soaked]], and use [[Flow]] to set up your draws.
- **Techniques:** Current Shift, Riptide
- **Response:** Undertow: when one of your Manifestations is attacked, move it to another empty slot of yours. The attack is cancelled.
- **In this chapter:** [[Soaked]], [[Flow]]
- **Hybrid:** [[Bloom]] · with Nature
- **Try it:** Trial of Tides

#### Soaked
- **Label:** GLOSSARY · WATER · glyph `soaked`
- **Archivist:** "Soak the biggest attacker before it swings. After the hit lands, it is too late."
- **Rule:** Water's control mark. A Soaked Manifestation deals 2 less damage with its next direct attack (minimum 0), then Soaked is removed. Status and indirect damage are unaffected. Riptide deals 2 damage to a Soaked Manifestation.
- **Quick facts:** On: Manifestation · Lasts: Next attack · Stacks: No
- **Demo:** Tide Brute with a drop glyph, showing "4 → 2".
- **Don't confuse with:** [[Weakened]], which is −1 ⚔ until destroyed. Soaked is −2 once.
- **Seen on:** River Serpent, Current Shift, Riptide
- **See also:** [[Water]], [[Bloom]]
- **Try it:** Trial of Tides

#### Flow
- **Label:** GLOSSARY · WATER
- **Archivist:** "Flow cannot give you a new card. It can make sure you never draw the wrong one."
- **Rule:** Deck control. Flow lets you look at the top card or cards of your [[Deck]] and keep each one on top or send it to the bottom.
- **Quick facts:** On: Your deck · Lasts: Instant · Stacks: No
- **Demo:** The top card flips face up. Choose between "Keep" (it stays on top) and "Bottom" (it slides under the deck).
- **Seen on:** Mist Adept, Tide Warden, Current Shift, Static Step, Recharge
- **See also:** [[Deck]], [[Exhaustion]]

---

## Chapter · Earth

#### Earth (element page)
- **Archivist:** "Earth does not need to win quickly. It only needs you to run out first."
- **Deck line:** **Iron Mountain** · DEFENSE · ARMOR
- **Rule:** Armor, Guard and attrition. Make every attack cost more than it gains.
- **Techniques:** Fortify, Stone Fist
- **Response:** Stonewall: when one of your Manifestations is attacked, give a friendly Manifestation 1 [[Armor]] until round end.
- **In this chapter:** [[Armor]], [[Guard]]
- **Hybrid:** [[Magma]] · with Fire
- **Try it:** Trial of Stone

#### Armor
- **Label:** GLOSSARY · EARTH · glyph `armor`
- **Archivist:** "Armor is gone by round end, whether it was used or not. Give it to whatever is about to be hit."
- **Rule:** Temporary protection on one Manifestation. Each Armor prevents 1 damage and is then used up. A Manifestation can gain Armor only once per round, and unused Armor is removed at round end. Stone Fist deals 1 damage plus 1 per Armor on the striker, without using that Armor up.
- **Quick facts:** On: Manifestation · Lasts: Round end · Stacks: No (1 per round)
- **Demo:** A plate with an Armor pip takes a "−3" hit. The pip cracks, and "−2" lands.
- **Don't confuse with:** [[Guard]], which protects the Bender. Eruption Guard (Magma) is a [[Quick]] card: it reduces the next attack damage by 1 until your next turn and is not Armor.
- **Seen on:** Stone Initiate, Boulder Ram, Fortify, Stone Fist, Stonewall, Molten Channel, Pressure Forge, Obsidian Ravager
- **See also:** [[Earth]], [[Magma]], [[Round]]

#### Guard
- **Label:** GLOSSARY · EARTH · glyph `guard`
- **Archivist:** "Guard protects one thing: your Bender. Your other Manifestations are still exposed."
- **Rule:** While a Guard is on your field, enemies normally cannot attack your Bender or target it with hostile damage. Guard does not protect other Manifestations. It works even with [[Summoning sickness]] or after attacking. A card that says it ignores Guard can still reach the Bender.
- **Quick facts:** On: Manifestation · Lasts: While on field · Stacks: No
- **Demo:** An attack arrow bends away from the Bender plate onto the Guard.
- **Don't confuse with:** [[Armor]], which reduces damage to one Manifestation.
- **Seen on:** Ember Guard, Tide Warden, Earthen Guard. Ignored by: Sky Raptor (with Momentum), Tempest Striker (during Resonance)
- **See also:** [[Momentum]], [[Storm]]

---

## Chapter · Nature

#### Nature (element page)
- **Archivist:** "Nature loses the first two turns on purpose. Count what is on its board by the fourth."
- **Deck line:** **Living Path** · GROWTH · SEEDED
- **Rule:** Healing and scaling boards. [[Seeded]] Manifestations gain [[Growth]] and keep it.
- **Techniques:** Verdant Mend, Wild Growth
- **Response:** Second Bloom: when one of your Manifestations is attacked, heal a damaged friendly Manifestation for 1, once per Manifestation per duel.
- **In this chapter:** [[Seeded]], [[Growth]], [[Second Bloom Used]]
- **Hybrid:** [[Bloom]] · with Water
- **Try it:** Trial of Roots

#### Seeded
- **Label:** GLOSSARY · NATURE · glyph `seeded`
- **Archivist:** "Plant the seed on the card you plan to keep. Growth only goes where a seed already is."
- **Rule:** Nature's setup effect on one Manifestation. Seeded Manifestations can receive Nature healing and [[Growth]] effects.
- **Quick facts:** On: Manifestation · Lasts: Stays · Stacks: No
- **Demo:** A seed glyph drops onto Grove Beast. Verdant Mend is tapped, and a Growth pip sprouts.
- **Don't confuse with:** [[Growth]]. Seeded is the soil; Growth is what grows in it.
- **Seen on:** Sproutling, Verdant Mend, Wild Growth, Rainseed, Flourishing Current, Reclaiming Tide
- **See also:** [[Nature]], [[Bloom]]
- **Try it:** Trial of Roots

#### Growth
- **Label:** GLOSSARY · NATURE · glyph `growth`
- **Archivist:** "Growth is permanent. Three turns of patience can produce an attacker that never shrinks."
- **Rule:** Nature's scaling resource. Each Growth gives that Manifestation +1 ATK, up to 3 Growth.
- **Quick facts:** On: Manifestation · Lasts: Stays · Stacks: Up to 3
- **Demo:** ⚔ 2 → 3 → 4 → 5 as three Growth pips fill, then a fourth bounces off the "max 3" cap.
- **Don't confuse with:** [[Momentum]], which also gives +1 ⚔ but is gone at round end.
- **Seen on:** Root Keeper, Grove Beast, Verdant Mend, Wild Growth, Rainseed, Tidelily Guardian, Flourishing Current, Reclaiming Tide
- **See also:** [[Seeded]], [[Bloom]]

#### Second Bloom Used
- **Label:** GLOSSARY · NATURE
- **Archivist:** "Second Bloom saves each creature once. After that, keep it out of danger."
- **Rule:** This Manifestation has already been healed by Second Bloom this duel and cannot be healed by it again.
- **Quick facts:** On: Manifestation · Lasts: Stays · Stacks: No
- **Seen on:** Second Bloom
- **See also:** [[Response]]

---

## Chapter · Lightning

#### Lightning (element page)
- **Archivist:** "Three cards in the right order beat three stronger cards in the wrong one."
- **Deck line:** **Flash Circuit** · COMBO · CHARGED
- **Rule:** Fast [[Chain]]s and sequencing. Order your cards each turn so later ones gain the bonus.
- **Techniques:** Static Step, Recharge
- **Response:** Flash Step: when one of your Manifestations is attacked, deal 2 damage to the attacker before combat. If that destroys the attacker, the attack is cancelled.
- **In this chapter:** [[Charged]], [[Chain]]
- **Hybrid:** [[Storm]] · with Air
- **Try it:** Trial of Storms

#### Charged
- **Label:** GLOSSARY · LIGHTNING · glyph `charged`
- **Archivist:** "Charged is a debt the next Lightning strike collects. Leave it unused and it expires at round end."
- **Rule:** Lightning's temporary payoff mark. The next Lightning attack that hits a Charged target deals +1 damage, then Charged is used up. Unused Charged is removed at round end.
- **Quick facts:** On: Manifestation or Bender · Lasts: Until used or round end · Stacks: No
- **Demo:** A bolt glyph on the rival Bender. A Lightning attack lands "+1" and the bolt fades.
- **Don't confuse with:** [[Chain]], which counts your plays. Charged marks a target.
- **Seen on:** Static Step, Crosswind Spark, Thunderstep
- **See also:** [[Storm]], [[Round]]
- **Try it:** Trial of Storms

#### Chain
- **Label:** GLOSSARY · LIGHTNING
- **Archivist:** "The Chain resets every turn. Plan the order of your cards, not just which ones to play."
- **Rule:** The number of [[Prime]] cards you have played in a row this turn. Spark Runner adds +1 Chain when it is your second card. Arc Runner gains +1 ATK at Chain 2+. Volt Lynx's first attack deals +2 damage at Chain 3+.
- **Quick facts:** On: Your turn · Lasts: This turn · Stacks: Counts up
- **Demo:** Three cards played left to right, with a counter ticking 1 · 2 · 3. Volt Lynx glows at 3.
- **Don't confuse with:** [[Resonance]], which needs one card from each parent element.
- **Seen on:** Spark Runner, Arc Runner, Volt Lynx, Static Step
- **See also:** [[Lightning]], [[Turn]]

---

## Chapter · Air

#### Air (element page)
- **Archivist:** "Air's strength lasts one round. Whatever you do not spend, the wind takes back."
- **Deck line:** **Dancing Gale** · TEMPO · MOMENTUM
- **Rule:** Movement and tactical attacks. Stack [[Momentum]] and strike past [[Guard]] before it fades.
- **Techniques:** Crosswind, Downdraft
- **Response:** Slipstream: when one of your Manifestations is attacked, swap it with another friendly Manifestation. The attack continues against the replacement.
- **In this chapter:** [[Momentum]], [[Weakened]]
- **Hybrid:** [[Storm]] · with Lightning
- **Try it:** Trial of Winds

#### Momentum
- **Label:** GLOSSARY · AIR · glyph `momentum`
- **Archivist:** "Momentum is lost at round end. Build it and attack in the same turn."
- **Rule:** Air's temporary stacking resource. Each Momentum gives that Manifestation +1 ATK, up to 3. All Momentum is removed at round end. While Sky Raptor has Momentum, it may attack the Bender, ignoring [[Guard]].
- **Quick facts:** On: Manifestation · Lasts: Round end · Stacks: Up to 3
- **Demo:** Wind streaks wrap Sky Raptor, ⚔ goes 3 → 4, and its arrow curves past the Guard to the Bender.
- **Don't confuse with:** [[Growth]], which also gives +1 ⚔ but is permanent.
- **Seen on:** Breeze Disciple, Gale Scout, Sky Raptor, Crosswind, Downdraft, Crosswind Spark, Thunderstep
- **See also:** [[Guard]], [[Storm]]
- **Try it:** Trial of Winds

#### Weakened
- **Label:** GLOSSARY · AIR · glyph `weakened`
- **Archivist:** "Crosswind weakens both enemies it swaps; Downdraft weakens one. Either way, the −1 never goes away."
- **Rule:** −1 ATK on an enemy Manifestation, from Crosswind (both swapped enemies) or Downdraft (one enemy). It does not stack on the same Manifestation and lasts until that Manifestation is destroyed.
- **Quick facts:** On: Manifestation · Lasts: Until destroyed · Stacks: No
- **Demo:** Two enemy plates swap places and both show ⚔ −1.
- **Don't confuse with:** [[Soaked]], which is −2 for one attack only.
- **Seen on:** Crosswind, Downdraft
- **See also:** [[Air]]

---

## Chapter · Magma

#### Magma (element page)
- **Label:** GLOSSARY · HYBRID ELEMENT
- **Archivist:** "Fire that refuses to burn out. It pushes forward and does not fall when struck back."
- **Deck line:** **Magma** · FIRE + EARTH · DURABLE PRESSURE
- **Rule:** [[Burning]], [[Armor]] and durable pressure. Under [[Resonance]], Molten Channel does both its options, Obsidian Ravager turns spare Armor into Burning, and Pressure Forge burns an enemy that is already Burning.
- **In this chapter:** [[Resonance]], [[Burning]], [[Armor]]
- **Parents:** [[Fire]] & [[Earth]]
- **Try it:** none yet. Hybrid Trials will come later.

## Chapter · Bloom

#### Bloom (element page)
- **Label:** GLOSSARY · HYBRID ELEMENT
- **Archivist:** "Water buys the time. Nature spends it on growing."
- **Deck line:** **Bloom** · WATER + NATURE · SCALING SUSTAIN
- **Rule:** [[Seeded]], [[Growth]] and sustain. Under [[Resonance]], Rainseed grants Growth directly, Flourishing Current heals and grows, and Tidelily Guardian heals each time it grows.
- **In this chapter:** [[Resonance]], [[Seeded]], [[Growth]]
- **Parents:** [[Water]] & [[Nature]]

## Chapter · Storm

#### Storm (element page)
- **Label:** GLOSSARY · HYBRID ELEMENT
- **Archivist:** "Charge it, move it, strike before the round ends. Storm does not wait for a second chance."
- **Deck line:** **Storm** · LIGHTNING + AIR · MOBILE TEMPO
- **Rule:** Movement, [[Charged]] and tempo. Moving between slots is its trigger. Under [[Resonance]], Crosswind Spark also Charges, Tempest Striker ignores [[Guard]] after it moves, and Thunderstep strikes from a Charged or Momentum ally.
- **In this chapter:** [[Resonance]], [[Charged]], [[Momentum]]
- **Parents:** [[Lightning]] & [[Air]]

---

## Coverage and accuracy notes (for 2e-1)

- **Terms covered:** every key in `GLOSSARY` (`js/game.js`) has a page here, except
  `ATK` and `HP`, which became the **Attack ⚔** and **Health ♡** symbol pages.
  New pages: Health ♡, Essence ◆, Initiative, Round, Card Re-cycle, Card roles,
  Effects at a Glance and the nine element pages.
- **Rule text changes:** rule text is lightly reworded from `GLOSSARY`, but no
  rule changed. When the content moves into data, keep the phrases the existing
  dev checks look for: Soaked "Water's control mark" and "2 less damage"; Growth
  "+1 ATK" without "maximum HP".
- **Numbers:** these are read from the code as of 1.6.3. Vitality 30, Essence 2 →
  7, opening hand 4, Exhaustion 2 damage (+1 each time after, from 1.11.1), Response 2 Essence, Response Window 30
  s, Re-cycle 3 uses. A rules change that touches any of them must update this
  file (AGENTS.md §4).
