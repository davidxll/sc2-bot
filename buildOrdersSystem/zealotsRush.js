// @ts-check
const { createSystem, taskFunctions } = require('@node-sc2/core');
const { CHARGE } = require('@node-sc2/core/constants/upgrade');
const { Alliance } = require('@node-sc2/core/constants/enums');
const { CANCEL_LAST } = require('@node-sc2/core/constants/ability');
const { ASSIMILATOR, CYBERNETICSCORE, FORGE, GATEWAY, NEXUS, TWILIGHTCOUNCIL, ROBOTICSBAY, ROBOTICSFACILITY, PROBE } = require('@node-sc2/core/constants/unit-type');

const { build, upgrade } = taskFunctions;

const wishList = [
  [15, build(GATEWAY)],
  [18, build(ASSIMILATOR)],
  [21, build(NEXUS)],
  [23, build(ASSIMILATOR)],
  [24, build(FORGE)],
  [25, build(CYBERNETICSCORE)],
  [34, build(ROBOTICSFACILITY)],
  [34, build(GATEWAY, 3)],
  [37, build(ROBOTICSBAY)],
  [40, build(ASSIMILATOR)],
  [70, build(NEXUS)],
  [75, build(ASSIMILATOR, 2)],
]

const defaultOptions = {
  state: {
    armySize: 12,
    buildCompleted: false,
  },
}

const getNumeros = ({ minerals, vespene, foodCap, foodUsed, foodArmy, foodWorkers, idleWorkerCount, armyCount, warpGateCount, larvaCount }) => {
  return { minerals, vespene, foodCap, foodUsed, foodArmy, foodWorkers, idleWorkerCount, armyCount, warpGateCount, larvaCount }
}

async function onGameStart() {
  console.log(`onGameStart in zealotsRush`)
}

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
  const { actions, units, map } = resources.get();
  
  // if the unit is a probe...
  if (newUnit.isWorker()) {
    /* tell it to go gather minerals - we get a little bonus here
     * because the `gather()` function also has it check for the 
     * closest mineral field at the base that needs workers, so this
     * will *also* balance for us! */
    return actions.gather(newUnit);
  } else if (newUnit.isCombatUnit()) {
    /* `map.getCombatRally()` is sort of a silly helper, but it's 
     * a good enough default we can use for now :) */
    return actions.attackMove(newUnit, map.getCombatRally());
  }
  const bases = units.getBases(Alliance.SELF);
  const workersNumber = units.getWorkers().length
  const noMoreWorkersPls = workersNumber > (bases.length * 20)
  this.setState({ noMoreWorkersPls });
}

async function onStep({ agent, data, resources }) {
  const { units, actions, map } = resources.get();
  
  // only get idle units, so we know how many are in waiting
  const idleCombatUnits = units.getCombatUnits().filter(u => u.noQueue);
  if (idleCombatUnits.length > this.state.armySize) {
    // add to our army size, so each attack is slightly larger
    this.setState({ armySize: this.state.armySize + 4 });
    const [enemyMain, enemyNat] = map.getExpansions(Alliance.ENEMY);
    
    return Promise.all([enemyNat, enemyMain].map((expansion) => {
      console.log('Attack!!')
      return actions.attackMove(idleCombatUnits, expansion.townhallPosition, true);
    }));
  }

  // back to work, beaches!
  const idles = units.getIdleWorkers()
  if (idles.length > 0) {
    console.log('Latigazo!!')
    return idles.map(unit => actions.gather(unit))
  }

  // Why tho T.T
  if (this.state.noMoreWorkersPls) {
    console.log('CANCEL, Beach!')
    const bases = units.getBases(Alliance.SELF);
    return Promise.all(bases.map(base => actions.do(CANCEL_LAST, base)))
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

async function buildComplete() {
  this.setState({ buildCompleted: true });
  console.log('buildCompleted on zealotsRush')
}

module.exports = createSystem({
  name: 'EightGateAllIn',
  type: 'build',
  buildOrder: wishList,
  defaultOptions,
  onStep,
  onGameStart,
  onUnitFinished,
  onUnitCreated,
  onUpgradeComplete,
  buildComplete
});
