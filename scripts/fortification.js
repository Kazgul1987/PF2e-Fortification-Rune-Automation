Hooks.on("createChatMessage", async (message) => {
    if (!message.isRoll || !message.rolls.length) return;
    
    const roll = message.rolls[0];
    const flags = message.flags?.pf2e;
    if (!flags || !flags.context?.outcome || flags.context.outcome !== "criticalSuccess") return;
    
    const target = canvas.tokens.get(flags.target?.token?.id);
    if (!target || !target.actor) return;
    
    // Prüfe auf Fortification-Runen
    const fortification = getFortificationRune(target.actor);
    if (!fortification) return;
    
    // Flat Check durchführen
    const flatCheckDC = fortification === "greater" ? 14 : 17;
    const flatCheckRoll = new Roll("1d20").roll({ async: false });
    
    // Falls erfolgreich, Krit in normalen Treffer umwandeln
    if (flatCheckRoll.total >= flatCheckDC) {
        ui.notifications.info(`${target.name}'s Fortification Rune negates the critical hit!`);
        message.update({ "flags.pf2e.context.outcome": "success" });
    }
});

function getFortificationRune(actor) {
    const fortificationRune = actor.items.find(item => {
        return item.type === "armor" && item.system.runes?.includes("fortification");
    });
    if (!fortificationRune) return null;
    return fortificationRune.system.runes.includes("greater") ? "greater" : "normal";
}
