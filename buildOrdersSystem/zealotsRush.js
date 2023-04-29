// @ts-check
const { createSystem, taskFunctions } = require('@node-sc2/core');
// const { distance } = require('@node-sc2/core/utils/geometry/point');
const { CHARGE } = require('@node-sc2/core/constants/upgrade');
const { Alliance } = require('@node-sc2/core/constants/enums');
const { CANCEL_LAST, CANCEL_QUEUEPASIVE } = require('@node-sc2/core/constants/ability');
const { ASSIMILATOR, CYBERNETICSCORE, FORGE, GATEWAY, NEXUS, TWILIGHTCOUNCIL, ROBOTICSBAY, ROBOTICSFACILITY,
  PROBE } = require('@node-sc2/core/constants/unit-type');

const { build, train, upgrade } = taskFunctions;

const INITIAL_WORKERS_PER_BASE = 22
const MAX_RESERVE_SIZE = 40

const buildOrder = [
  [14, train(PROBE, 3)],
  [15, build(GATEWAY)],
  [16, build(ASSIMILATOR)],
  [18, build(FORGE)],
  [20, build(CYBERNETICSCORE)],
  [17, build(NEXUS)],
  [19, build(ASSIMILATOR)],
  [21, build(ROBOTICSFACILITY)],
  [22, build(GATEWAY, 3)],
  [23, build(ROBOTICSBAY)],
  [25, build(TWILIGHTCOUNCIL)],
  [24, build(ASSIMILATOR)],
  [26, build(NEXUS)],
  [27, build(ASSIMILATOR)],
  [28, build(NEXUS)],
  [29, build(ASSIMILATOR)],
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
    bitchesPerBase: INITIAL_WORKERS_PER_BASE,
    noMoreWorkersPls: false
  },
}

const wishList = []

const getNumeros = ({ minerals, vespene, foodCap, foodUsed, foodArmy, foodWorkers, idleWorkerCount, armyCount, warpGateCount, larvaCount }) => {
  return { minerals, vespene, foodCap, foodUsed, foodArmy, foodWorkers, idleWorkerCount, armyCount, warpGateCount, larvaCount }
}

const repeat = (item, times) => {
	let rslt = [];
	for (let i = 0; i < times; i++) {
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
  }
  const dirtyBitches = getBitchBitches(units.getBases(Alliance.SELF).filter(b => b.buildProgress >= 1), units.getMineralWorkers(), units)
  if (dirtyBitches.length > 0) {
    console.log(`MOVILIZING ${dirtyBitches.length} bitches`)
    return Promise.all(dirtyBitches.map(bitch => actions.gather(bitch)))
  }

}

async function onUnitCreated({ agent, resources }, newUnit) {
  const { actions, units, map } = resources.get();
  const { foodCap, foodUsed } = agent
  const foodLeft = foodCap - foodUsed
  const miaBases = units.getBases(Alliance.SELF).filter(b => b.buildProgress >= 1)
  // actual units logic
  if (newUnit.isWorker()) {
    actions.gather(newUnit);
  } else if (newUnit.isCombatUnit()) {
    actions.attackMove(newUnit, map.getCombatRally());
  }

  // other logic to do when a unit is created
  const noMoreWorkersPls = units.getWorkers().length > (miaBases.length * this.state.bitchesPerBase)
  this.setState({ noMoreWorkersPls });
  
  // const needyBases = getNeedyBases(miaBases)

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
  }
}

async function onStep({ agent, data, resources }) {
  const { units, actions, map } = resources.get();
  const { foodCap, foodUsed } = agent
  const foodLeft = foodCap - foodUsed
  const miaBases = units.getBases(Alliance.SELF).filter(b => b.buildProgress >= 1)
  
  // only get idle units, so we know how many are in waiting
  const idleCombatUnits = units.getCombatUnits().filter(u => u.noQueue);
  if (idleCombatUnits.length > this.state.armySize) {
    // add to our army size, so each attack is slightly larger
    if (this.state.armySize < MAX_RESERVE_SIZE) {
      this.setState({ armySize: this.state.armySize + 4 });
    }
    const [enemyMain, enemyNat] = map.getExpansions(Alliance.ENEMY);
    
    return Promise.all([enemyNat, enemyMain].map((expansion) => {
      console.log('Attack!!')
      return actions.attackMove(idleCombatUnits, expansion.townhallPosition, true);
    }));
  }

  // Why tho T.T
  if (this.state.noMoreWorkersPls) {
    const basesTrainingBitch = units.getBases(Alliance.SELF).filter(b => b.abilityAvailable(CANCEL_QUEUEPASIVE)) // bases[0].abilityAvailable(207)
    return Promise.all(basesTrainingBitch.map(base => actions.do(CANCEL_QUEUEPASIVE, base)))
  } else if (wishList.length > 0) {
    console.log(`Why tho T.T - ${wishList.length}`)
    const { unitId, production } = wishList[0]
    try {
      if (agent.canAfford(unitId) && agent.hasTechFor(unitId)) {
        wishList.shift()
        return actions.train(unitId, production)
      }
    } catch(err) {
      console.log('fucking Daniel ', err.message)
      return 'oka'
    }
  }

  const needyBases = miaBases.filter(base => base.assignedHarvesters < base.idealHarvesters)

  if (foodLeft > (needyBases.length * 2)) {
    // order needed workers in their base
    try {
      return Promise.all(needyBases.map(base => actions.train(PROBE, base)))
    } catch (err) {
      console.log('gaddemit daniel ', err.message)
      return 'oops'
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
