// @ts-check
const { createSystem, taskFunctions } = require('@node-sc2/core');
// const { distance } = require('@node-sc2/core/utils/geometry/point');
const { CHARGE } = require('@node-sc2/core/constants/upgrade');
const { Alliance } = require('@node-sc2/core/constants/enums');
const { CANCEL_LAST, CANCEL_QUEUEPASIVE } = require('@node-sc2/core/constants/ability');
const { ASSIMILATOR, CYBERNETICSCORE, FORGE, GATEWAY, NEXUS, TWILIGHTCOUNCIL, ROBOTICSBAY, ROBOTICSFACILITY,
  PROBE } = require('@node-sc2/core/constants/unit-type');

const { build, upgrade } = taskFunctions;

const WORKERS_PER_BASE = 20
const MAX_ARMY_SIZE = 80

// const buildOrder = [
//   [15, build(GATEWAY)],
//   [18, build(ASSIMILATOR)],
//   [21, build(NEXUS)],
//   [24, build(FORGE)],
//   [28, build(ASSIMILATOR)],
//   [30, build(CYBERNETICSCORE)],
//   [34, build(ROBOTICSFACILITY)],
//   [34, build(GATEWAY, 3)],
//   [37, build(ROBOTICSBAY)],
//   [40, build(ASSIMILATOR, 2)],
//   [39, build(TWILIGHTCOUNCIL)],
//   [70, build(NEXUS)],
//   [75, build(ASSIMILATOR, 2)],
//   [100, build(NEXUS)],
//   [120, build(ASSIMILATOR, 2)],
//   [130, build(ROBOTICSFACILITY, 2)],
//   [140, build(GATEWAY, 3)],
//   [150, build(NEXUS)],
//   [170, build(ASSIMILATOR, 2)],
// ]

const buildOrder = [
  [15, build(GATEWAY)],
  [16, build(ASSIMILATOR)],
  [17, build(NEXUS)],
  [18, build(FORGE)],
  [19, build(ASSIMILATOR)],
  [20, build(CYBERNETICSCORE)],
  [21, build(ROBOTICSFACILITY)],
  [22, build(GATEWAY, 3)],
  [23, build(ROBOTICSBAY)],
  [24, build(ASSIMILATOR, 2)],
  [25, build(TWILIGHTCOUNCIL)],
  [26, build(NEXUS)],
  [27, build(ASSIMILATOR, 2)],
  [28, build(NEXUS)],
  [29, build(ASSIMILATOR, 2)],
  [30, build(ROBOTICSFACILITY, 2)],
  [31, build(GATEWAY, 3)],
  [32, build(NEXUS)],
  [33, build(ASSIMILATOR, 2)],
  [34, build(GATEWAY, 3)],
  [35, build(ROBOTICSFACILITY, 2)],
]

const defaultOptions = {
  state: {
    armySize: 12,
    bitchesPerBase: 22,
    noMoreWorkersPls: false
  },
}

const wishList = []

const getNumeros = ({ minerals, vespene, foodCap, foodUsed, foodArmy, foodWorkers, idleWorkerCount, armyCount, warpGateCount, larvaCount }) => {
  return { minerals, vespene, foodCap, foodUsed, foodArmy, foodWorkers, idleWorkerCount, armyCount, warpGateCount, larvaCount }
}

const repeat = (item, times) => {
	let rslt = [];
	for(let i = 0; i < times; i++) {
  	rslt.push(item)
  }
  return rslt;
}

// bases that need workers
function getNeedyBases(ownBases) {
  let needyBases = [];
  ownBases.forEach(base => {
    const diff = base.assignedHarvesters - base.idealHarvesters
    if(diff > 0) {
      needyBases.push({diff, base})
    }
  })
  return needyBases
}

// For the overcrowded bases
function getBitchBitches(ownBases, bitches, units) {
  let dirtyBitches = [];
  const bitchedBases = getNeedyBases(ownBases)
  bitchedBases.forEach(({ diff, base }) => {
    const extraBitches = units.getClosest(base.pos, bitches, diff);
    dirtyBitches.push(...extraBitches)
  })
  return dirtyBitches
}

async function onGameStart({ resources }) {
  const { units } = resources.get()
  units.getWorkers().forEach(worker => worker.labels.set('oldBitch', true));
  console.log(`onGameStart in zealotsRush`)
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
    console.log('expanded!')
    const dirtyBitches = getBitchBitches(units.getBases(Alliance.SELF).filter(b => b.buildProgress >= 1), units.getMineralWorkers(), units)
    if (dirtyBitches.length > 0) {
      console.log(`MOVILIZING ${dirtyBitches.length} bitches`)
      return Promise.all(dirtyBitches.map(bitch => actions.gather(bitch)))
    }
  }
  
}

async function onUnitCreated({ agent, resources }, newUnit) {
  const { actions, units, map } = resources.get();
  const { foodCap, foodUsed } = agent
  const foodLeft = foodCap - foodUsed
  const miaBases = units.getBases(Alliance.SELF)
  // actual units logic
  if (newUnit.isWorker()) {
    actions.gather(newUnit);
  } else if (newUnit.isCombatUnit()) {
    actions.attackMove(newUnit, map.getCombatRally());
  }

  // other logic to do when a unit is created
  const noMoreWorkersPls = units.getWorkers().length > (miaBases.length * this.state.bitchesPerBase)
  this.setState({ noMoreWorkersPls });
  
  const needyBases = getNeedyBases(miaBases)

  if (noMoreWorkersPls) {
    console.log(`no moer twerkers - foodcap: ${foodCap}`)
    if(foodCap > 50 && foodCap < 100) {
      console.log('set bitchesPerBase to 20')
      this.setState({ bitchesPerBase: 20 })
    } else if(foodCap > 100 && foodCap < 150) {
      console.log('set bitchesPerBase to 16')
      this.setState({ bitchesPerBase: 16 })
    } else if(foodCap > 150) {
      console.log('set bitchesPerBase to 14')
      this.setState({ bitchesPerBase: 14 })
    }
  } else if (foodLeft > 2 * needyBases.length) {
    // order needed workers in their base
    needyBases.forEach(({ diff, base }) => {
      console.log('training more bitches - ', diff)
      const orders = repeat({ unitId: PROBE, production: base }, diff)
      wishList.push(...orders)
    })
  } else {
    console.log(`no action needed ${JSON.stringify({foodLeft, needyBasesLength: needyBases.length, noMoreWorkersPls})}`)
  }
}

async function onStep({ agent, data, resources }) {
  const { units, actions, map } = resources.get();
  
  // only get idle units, so we know how many are in waiting
  const idleCombatUnits = units.getCombatUnits().filter(u => u.noQueue);
  if (idleCombatUnits.length > this.state.armySize) {
    // add to our army size, so each attack is slightly larger
    if (this.state.armySize < MAX_ARMY_SIZE)
    this.setState({ armySize: this.state.armySize + 4 });
    const [enemyMain, enemyNat] = map.getExpansions(Alliance.ENEMY);
    
    return Promise.all([enemyNat, enemyMain].map((expansion) => {
      console.log('Attack!!')
      return actions.attackMove(idleCombatUnits, expansion.townhallPosition, true);
    }));
  }

  // Why tho T.T
  if (this.state.noMoreWorkersPls) {
    const basesBuildingShit = units.getBases(Alliance.SELF).filter(b => b.abilityAvailable(CANCEL_QUEUEPASIVE)) // bases[0].abilityAvailable(207)
    return Promise.all(basesBuildingShit.map(base => actions.do(CANCEL_QUEUEPASIVE, base)))
  } else if (wishList.length > 0) {
    const { unitId, production } = wishList[0]
    if (agent.canAfford(unitId) && agent.hasTechFor(unitId)) {
      wishList.shift()
      console.log(`got your ${unitId}, babe ;)`)
      return actions.train(unitId, production)
    }
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
