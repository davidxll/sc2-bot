// @ts-check
const { createSystem, taskFunctions } = require('@node-sc2/core');
// const { distance } = require('@node-sc2/core/utils/geometry/point');
const { CHARGE } = require('@node-sc2/core/constants/upgrade');
const { Alliance } = require('@node-sc2/core/constants/enums');
const { CANCEL_LAST } = require('@node-sc2/core/constants/ability');
const { ASSIMILATOR, CYBERNETICSCORE, FORGE, GATEWAY, NEXUS, TWILIGHTCOUNCIL, ROBOTICSBAY, ROBOTICSFACILITY } = require('@node-sc2/core/constants/unit-type');

const { build, upgrade } = taskFunctions;

const WORKERS_PER_BASE = 19

const buildOrder = [
  [15, build(GATEWAY)],
  [18, build(ASSIMILATOR)],
  [21, build(NEXUS)],
  [24, build(FORGE)],
  [28, build(ASSIMILATOR)],
  [30, build(CYBERNETICSCORE)],
  [34, build(ROBOTICSFACILITY)],
  [34, build(GATEWAY, 3)],
  [37, build(ROBOTICSBAY)],
  [40, build(ASSIMILATOR, 2)],
  [39, build(TWILIGHTCOUNCIL)],
  [70, build(NEXUS)],
  [75, build(ASSIMILATOR, 2)],
]

const defaultOptions = {
  state: {
    armySize: 12,
    buildCompleted: false,
    noMoreWorkersPls: false
  },
}

const getNumeros = ({ minerals, vespene, foodCap, foodUsed, foodArmy, foodWorkers, idleWorkerCount, armyCount, warpGateCount, larvaCount }) => {
  return { minerals, vespene, foodCap, foodUsed, foodArmy, foodWorkers, idleWorkerCount, armyCount, warpGateCount, larvaCount }
}

// For the overcrowded bases
function getDirtyBitches(ownBases, mineralBitches, units) {
  let dirtyBitches = [];
  ownBases.forEach(base => {
    const diff = base.assignedHarvesters - base.idealHarvesters
    if(diff > 0) {
      const extraBitches = units.getClosest(base.pos, mineralBitches, diff);
      dirtyBitches.push(...extraBitches)
    }
  })
  return dirtyBitches
}

async function onGameStart({ resources }) {
  const { units } = resources.get()
  console.log(`onGameStart in zealotsRush`)
  units.getWorkers().forEach(worker => worker.labels.set('oldBitch', true));
  units.getBases(Alliance.SELF)[0].labels.set('allYourBase', true)
}

async function onUnitIdle({ resources }, idleUnit) {
  if (idleUnit.isWorker()) {
    return resources.get().actions.gather(idleUnit);
  }
}

async function onUnitFinished({ resources }, newBuilding) {
  const { units, actions } = resources.get();
  // check to see if the unit in question is a gas mine
  if (newBuilding.isGasMine()) {
    const threeWorkers = units.getClosest(newBuilding.pos, units.getMineralWorkers(), 3);
    threeWorkers.forEach(worker => worker.labels.set('gasWorker', true));
    return actions.mine(threeWorkers, newBuilding);
  }

  if (newBuilding.isTownhall()) {
    // no se si funciona
    console.log('MAGIA here')
    const oldBitches = units.withLabel('oldBitch');
    const daBase = units.withLabel('allYourBase')[0];
    const mineFields = units.getMineralFields();
    const targetBaseField = units.getClosest(daBase.pos, mineFields, 1)[0];
    return Promise.all(oldBitches.map(bitch => actions.gather(bitch, targetBaseField)))
  }
  
  const dirtyBitches = getDirtyBitches(units.getBases(Alliance.SELF), units.getMineralWorkers(), units)
  if (dirtyBitches.length > 0) {
    console.log(`MOVILIZING ${dirtyBitches.length} bitches`)
    return Promise.all(dirtyBitches.map(bitch => actions.gather(bitch)))
  }
}

async function onUnitCreated({ resources }, newUnit) {
  const { actions, units, map } = resources.get();
  
  // actual units logic
  if (newUnit.isWorker()) {
    return actions.gather(newUnit);
  } else if (newUnit.isCombatUnit()) {
    return actions.attackMove(newUnit, map.getCombatRally());
  }

  // other logic to do when a unit is created
  const noMoreWorkersPls = units.getWorkers().length > (units.getBases(Alliance.SELF).length * WORKERS_PER_BASE)
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

  // Why tho T.T
  if (this.state.noMoreWorkersPls) {
    const bases = units.getBases(Alliance.SELF);
    return Promise.all(bases.map(base => actions.do(CANCEL_LAST, base)))
  }
  // if (this.state.noMoreWorkersPls) {
  //   console.log('CANCEL, Beach!!')
  //   const canCancel = units.getBases(Alliance.SELF).filter(b => b.abilityAvailable(CANCEL_LAST));
  //   console.log(canCancel[0] && canCancel[0].orders)
  //   if(canCancel.length > 0) {
  //     return Promise.all(canCancel.map(base => actions.do(CANCEL_LAST, base)))
  //   }
  // }
}

async function onUpgradeComplete({ resources }, upgrade) {
  // if (upgrade === CHARGE) {
  //   const { units, map, actions } = resources.get();
  //   const combatUnits = units.getCombatUnits();
  //   // get our enemy's bases...
  //   const [enemyMain, enemyNat] = map.getExpansions(Alliance.ENEMY);

  //   // queue up our army units to attack both bases (in reverse, natural first)
  //   return Promise.all([enemyNat, enemyMain].map((expansion) => {
  //     return actions.attackMove(combatUnits, expansion.townhallPosition, true);
  //   }));
  // }
}

async function buildComplete() {
  this.setState({ buildCompleted: true });
  console.log('buildCompleted on zealotsRush')
}

module.exports = createSystem({
  name: 'EightGateAllIn',
  type: 'build',
  buildOrder,
  defaultOptions,
  onStep,
  onGameStart,
  onUnitIdle,
  onUnitFinished,
  onUnitCreated,
  onUpgradeComplete,
  buildComplete
});
