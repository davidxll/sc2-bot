// @ts-check
const { createSystem, taskFunctions } = require('@node-sc2/core');
// const { distance } = require('@node-sc2/core/utils/geometry/point');
const { CHARGE } = require('@node-sc2/core/constants/upgrade');
const { Alliance } = require('@node-sc2/core/constants/enums');
const { CANCEL_LAST, CANCEL_QUEUEPASIVE } = require('@node-sc2/core/constants/ability');
const { ASSIMILATOR, CYBERNETICSCORE, FORGE, GATEWAY, NEXUS, TWILIGHTCOUNCIL, ROBOTICSBAY, ROBOTICSFACILITY,
  PROBE, FLEETBEACON } = require('@node-sc2/core/constants/unit-type');
const { getTownhallPlacement, getBuildingPlacement } = require('../helpers/placement');
const { distance } = require('@node-sc2/core/utils/geometry/point');

const { build, train, upgrade } = taskFunctions;

const buildOrder = [
  [14, train(PROBE)],
  [15, build(GATEWAY)],
  [16, train(PROBE, 4)],
  [17, build(ASSIMILATOR)],
  [18, build(NEXUS)],
  [19, build(FORGE)],
  [20, build(CYBERNETICSCORE)],
  [19, build(ASSIMILATOR)],
  [21, build(ROBOTICSFACILITY)],
  [22, build(GATEWAY)],
  [23, build(ROBOTICSBAY)],
  [25, build(TWILIGHTCOUNCIL)],
  [24, build(ASSIMILATOR)],
  [26, build(NEXUS)],
  [27, build(ASSIMILATOR)],
  [28, build(NEXUS)],
  [29, build(ASSIMILATOR)],
  [33, build(ROBOTICSFACILITY, 2)],
  [34, build(NEXUS)],
  [35, build(ASSIMILATOR, 2)],
  [36, build(GATEWAY), 2],
  [38, build(FLEETBEACON)],
  [40, build(GATEWAY), 2],
  [42, build(ASSIMILATOR, 3)],
  [150, build(NEXUS)],
]

const defaultOptions = {
  state: {
    noMoreWorkersPls: false,
    expanseMode: false,
    needyGasMine: null,
    forTheWatch: false
  },
}

const getNumeros = ({ minerals, vespene, foodCap, foodUsed, foodArmy, foodWorkers, idleWorkerCount, armyCount, warpGateCount, larvaCount }) => {
  return { minerals, vespene, foodCap, foodUsed, foodArmy, foodWorkers, idleWorkerCount, armyCount, warpGateCount, larvaCount }
}

// bases that need workers
function getNeedyBases(ownBases) {
  let needyBases = [];
  ownBases.forEach(base => {
    const diff = base.idealHarvesters - base.assignedHarvesters
    if(diff > 0) {
      needyBases.push({diff, base})
    }
  })
  return needyBases
}

// For the overcrowded bases
function getLeftoverBitches(ownBases, bitches, units) {
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
    await Promise.all(units.getMineralWorkers().map(bitch => actions.gather(bitch)))
  }

}

async function onUnitCreated({ agent, resources }, newUnit) {
  const { actions, units, map } = resources.get();
  const { foodCap, foodUsed } = agent
  const foodLeft = foodCap - foodUsed
  const miaBases = units.getBases(Alliance.SELF)
  // actual units logic
  if (newUnit.isWorker()) {
    await actions.gather(newUnit);
  } else if (newUnit.isCombatUnit()) {
    await actions.attackMove(newUnit, map.getCombatRally());
  }
  
  // other logic to do when a unit is created
  const noMoreWorkersPls = miaBases.every(base => (base.assignedHarvesters >= base.idealHarvesters) && base.buildProgress >= 1)
  this.setState({ noMoreWorkersPls });
  
  // const needyBases = getNeedyBases(miaBases)

  if (this.state.needyGasMine) {
    const it = units.getClosest(this.state.needyGasMine.pos, units.getMineralWorkers())
    if (this.state.needyGasMine.assignedHarvesters < 3) {
      try {
        console.log('work. Beach!')
        await actions.mine(it, this.state.needyGasMine);
      } catch(err) {
        console.log('why tho T.T', err.message)
      }
    }
    this.setState({needyGasMine: null})
  }

  const dirtyBitches = getLeftoverBitches(units.getBases(Alliance.SELF).filter(b => b.buildProgress >= 1), units.getMineralWorkers(), units)
  if (dirtyBitches.length > 0) {
    console.log(`MOVILIZING ${dirtyBitches.length} bitches`)
    await Promise.all(dirtyBitches.map(bitch => actions.gather(bitch)))
  }
}

async function onStep(world) {
  const { agent, data, resources } = world
  const { units, actions, map } = resources.get();
  const { foodCap, foodUsed, minerals } = agent
  const foodLeft = foodCap - foodUsed
  const miaBases = units.getBases(Alliance.SELF).filter(b => b.buildProgress >= 1)

  // Why tho T.T
  if (this.state.noMoreWorkersPls) {
    const basesTrainingBitch = units.getBases(Alliance.SELF).filter(b => b.abilityAvailable(CANCEL_QUEUEPASIVE)) // bases[0].abilityAvailable(207)
    await Promise.all(basesTrainingBitch.map(base => actions.do(CANCEL_QUEUEPASIVE, base)))
  }
  
  const needyBases = miaBases.filter(base => base.assignedHarvesters < base.idealHarvesters)
  
  if (needyBases.length > 0 && foodLeft > (needyBases.length * 2) && minerals > (needyBases.length * 50)) {
    try {
      await Promise.all(needyBases.map(base => actions.train(PROBE, base)))
    } catch (err) {
      // console.log('fucking shit ', err.message)
      // return 'oops'
    }
  }

  // GAS Business
  // Do we got idle gas stations?
  const assimilators = units.getGasMines().filter(b => b.buildProgress >= 1)
  const needyAssimilator = assimilators.find(a => a && a.assignedHarvesters < 3)
    if (needyAssimilator && !this.state.needyGasMine) {
      this.setState({ needyGasMine: needyAssimilator })
    }
  // do we need more gas stuff?

  // EXPANSE
  if (this.state.noMoreWorkersPls) {
    const placement = await getTownhallPlacement(world, NEXUS)
    // debug aqui
    if (placement) {
      await actions.build(NEXUS, placement)
    }
  }

  if (foodUsed > 101) {
    const geysers = units.getGasGeysers()
    map.getExpansions().forEach(({ pos }) => {
      const geyser = units.getClosest(pos, geysers)
      const dist = distance(geyser.pos, pos)
      if (dist < 100) {
        console.log('available geyser for ', JSON.stringify({dist, pos}))
      }
    })
  }

  if (foodCap === 200 && !this.state.forTheWatch) {
    console.log('FOR THE WATCH')
    this.setState({ forTheWatch: true })
  }

  if (foodCap === 200 && minerals > 1000) {
    console.log('more shit')
    const placement = getBuildingPlacement(world, GATEWAY)
    if (placement) {
      console.log('happening!')
      await actions.build(GATEWAY, placement)
    }
  }
}

async function onUpgradeComplete({ resources }, upgrade) {

}

async function buildComplete() {
  this.setState({ buildCompleted: true });
  console.log('buildCompleted on zealotsRush')
}

async function onUnitDamaged({ agent, resources }, unit) {
  const { actions, units, map } = resources.get()
  const { foodArmy } = agent
    if (unit.isTownhall() && unit.alliance === Alliance.SELF && foodArmy < 8) {
      const idleCombatUnits = units.getCombatUnits().filter(u => u.noQueue)
      const workers = unit.getWorkers()
      console.log('HOLD THE DOOR')
      return actions.attackMove([...idleCombatUnits, ...workers], unit.pos, true)
    } else if (this.state.forTheWatch) {
      const bitches = getLeftoverBitches()
      if (bitches.length > 0) {
        console.log('Bitches FTW: ', bitches)
        return actions.attackMove(bitches, unit.pos, true)
      }
    }
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
  buildComplete,
  onUnitDamaged
});
