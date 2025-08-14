const MODULE_ID = 'fortification-rune';

/**
 * Determine if the actor has a fortification rune.
 * Returns 'greater' for greater fortification, 'fortification' for normal, or null.
 */
function getFortificationRune(actor) {
  const armor = actor.itemTypes?.armor?.find(a => a.system?.equipped?.value);
  if (!armor) return null;

  let propertyRunes = armor.system?.runes?.property;
  if (Array.isArray(propertyRunes)) {
    propertyRunes = propertyRunes;
  } else if (propertyRunes?.value) {
    propertyRunes = propertyRunes.value;
  } else {
    propertyRunes = [];
  }
  propertyRunes = propertyRunes.map(r => typeof r === 'string' ? r : r?.slug ?? r);

  if (propertyRunes.includes('greater-fortification')) return 'greater';
  if (propertyRunes.includes('fortification')) return 'fortification';

  const name = armor.name.toLowerCase();
  if (name.includes('greater fortification')) return 'greater';
  if (name.includes('fortification')) return 'fortification';
  return null;
}

/**
 * Create a chat card with a button to roll the flat check.
 */
function postFortificationMessage(token, dc) {
  const content = `<div class="fortification-check" data-token="${token.id}" data-dc="${dc}">
    <button type="button" class="fortification-button">Fortification Check DC ${dc}</button>
  </div>`;
  ChatMessage.create({
    user: game.user.id,
    speaker: ChatMessage.getSpeaker({ token }),
    content
  });
}

/**
 * Handle button clicks for fortification checks.
 */
async function onButtonClick(event) {
  const button = event.currentTarget;
  const wrapper = button.closest('.fortification-check');
  const tokenId = wrapper.dataset.token;
  const dc = Number(wrapper.dataset.dc);
  const token = canvas.tokens.get(tokenId);
  if (!token) return;

  const roll = await new Roll('1d20').evaluate({ async: true });
  const success = roll.total >= dc;
  const speaker = ChatMessage.getSpeaker({ token });
  await roll.toMessage({
    speaker,
    flavor: `Fortification Flat Check (DC ${dc})`
  });
  const resultText = success
    ? `${token.name} reduces the critical hit to a normal hit.`
    : `${token.name} fails the Fortification flat check.`;
  await ChatMessage.create({ speaker, content: resultText });
  ui.notifications.info(resultText);
}

Hooks.once('ready', () => {
  console.log('Fortification Rune Automation | Ready');

  // Handle button clicks in chat cards
  document.addEventListener('click', event => {
    if (event.target.closest('.fortification-button')) {
      onButtonClick(event);
    }
  });
});

Hooks.on('createChatMessage', message => {
  const context = message.flags?.pf2e?.context;
  if (context?.type !== 'attack-roll' || context?.outcome !== 'criticalSuccess') return;

  for (const target of context.targets ?? []) {
    const token = canvas.tokens.get(target.token);
    const actor = token?.actor;
    if (!actor) continue;
    const rune = getFortificationRune(actor);
    if (!rune) continue;
    const dc = rune === 'greater' ? 14 : 17;
    postFortificationMessage(token, dc);
  }
});
