const MODULE_ID = 'fortification-rune';

/**
 * Determine if the actor has a fortification rune.
 * Returns 'greater' for greater fortification, 'fortification' for normal, or null.
 */
function getFortificationRune(actor) {
  const armor = actor.itemTypes?.armor?.find(a => a.system?.equipped?.value);
  if (!armor) return null;
  const propertyRunes = armor.system?.runes?.property ?? [];
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
    <button class="fortification-button">Fortification Check DC ${dc}</button>
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
function onButtonClick(event) {
  const button = event.currentTarget;
  const wrapper = button.closest('.fortification-check');
  const tokenId = wrapper.dataset.token;
  const dc = Number(wrapper.dataset.dc);
  const token = canvas.tokens.get(tokenId);
  if (!token) return;

  new Roll('1d20').evaluate({async: true}).then(roll => {
    roll.toMessage({
      speaker: ChatMessage.getSpeaker({ token }),
      flavor: `Fortification Flat Check (DC ${dc})`
    });
    if (roll.total >= dc) {
      ui.notifications.info(`${token.name} reduces the critical hit to a normal hit.`);
    } else {
      ui.notifications.info(`${token.name} fails the Fortification flat check.`);
    }
  });
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
  if (!message.isRoll) return;
  const flags = message.flags?.pf2e;
  if (!flags) return;
  const degree = flags.context?.degreeOfSuccess ?? (flags.context?.outcome === 'criticalSuccess' ? 2 : null);
  if (degree !== 2) return;

  const targets = flags.context?.targets?.map(t => t.token) ?? [flags.target?.token?.id].filter(Boolean);
  for (const targetId of targets) {
    const token = canvas.tokens.get(targetId);
    const actor = token?.actor;
    if (!actor) continue;
    const rune = getFortificationRune(actor);
    if (!rune) continue;
    const dc = rune === 'greater' ? 14 : 17;
    postFortificationMessage(token, dc);
  }
});
