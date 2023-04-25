const { createSystem, taskFunctions } = require('@node-sc2/core');
const { CHARGE } = require('@node-sc2/core/constants/upgrade');
const { Alliance } = require('@node-sc2/core/constants/enums');
const {
  ASSIMILATOR,
  CYBERNETICSCORE,
  GATEWAY,
  NEXUS,
  TWILIGHTCOUNCIL,
  ZEALOT
} = require('@node-sc2/core/constants/unit-type');

const { build, upgrade } = taskFunctions;

const wishList = [
  [16, build(ASSIMILATOR)],
  [17, build(GATEWAY)],
  [20, build(NEXUS)],
  [21, build(CYBERNETICSCORE)],
  [26, build(TWILIGHTCOUNCIL)],
  [34, upgrade(CHARGE)],
  [34, build(GATEWAY, 7)],
]

async function onUnitFinished({ resources }, newBuilding) { 
  // check to see if the unit in question is a gas mine
  if (newBuilding.isGasMine()) {
      const { units, actions } = resources.get();

      // get the three closest probes to the assimilator
      const threeWorkers = units.getClosest(newBuilding.pos, units.getMineralWorkers(), 3);
      // add the `gasWorker` label, this makes sure they aren't used in the future for building
      threeWorkers.forEach(worker => worker.labels.set('gasWorker', true));
      // send them to mine at the `newBuilding` (the assimilator)
      return actions.mine(threeWorkers, newBuilding);
  }
}

async function onUnitCreated({ resources }, newUnit) {
  // if the unit is a probe...
  if (newUnit.isWorker()) {
      const { actions } = resources.get();
      /* tell it to go gather minerals - we get a little bonus here
       * because the `gather()` function also has it check for the 
       * closest mineral field at the base that needs workers, so this
       * will *also* balance for us! */
      return actions.gather(newUnit);
  }
}

async function onStep({ agent, resources }) {
  const { units, actions, map } = resources.get();

  // all gateways that are done building and idle
  const idleGateways = units.getById(GATEWAY, { noQueue: true, buildProgress: 1 });

  if (idleGateways.length > 0) {
      // if there are some, send a command to each to build a zealot
      return Promise.all(idleGateways.map(gateway => actions.train(ZEALOT, gateway)));
  }
}

async function onUnitCreated({ resources }, newUnit) {
  // add `map` to the resources we're getting
  const { actions, map } = resources.get();

  // this was already here
  if (newUnit.isWorker()) {
      return actions.gather(newUnit);
      /* "if the new unit is a combat unit...", just in case we
      * decide to make something other than zealots */
  } else if (newUnit.isCombatUnit()) {
      /* `map.getCombatRally()` is sort of a silly helper, but it's 
       * a good enough default we can use for now :) */
      return actions.attackMove(newUnit, map.getCombatRally());
  }
}

async function onUpgradeComplete({ resources }, upgrade) {
  if (upgrade === CHARGE) {
      const { units, map, actions } = resources.get();

      const combatUnits = units.getCombatUnits();

      // get our enemy's bases...
      const [enemyMain, enemyNat] = map.getExpansions(Alliance.ENEMY);

      // queue up our army units to attack both bases (in reverse, natural first)
      return Promise.all([enemyNat, enemyMain].map((expansion) => {
          return actions.attackMove(combatUnits, expansion.townhallPosition, true);
      }));
  }
}

module.exports = createSystem({
    name: 'EightGateAllIn',
    type: 'build',
    buildOrder: wishList,
    onStep,
    onUnitFinished,
    onUnitCreated,
    onUnitCreated,
    onUpgradeComplete
});
