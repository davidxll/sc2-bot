// @ts-check
const { createSystem, taskFunctions } = require('@node-sc2/core');
const { Alliance } = require('@node-sc2/core/constants/enums');
const { GATEWAY, NEXUS, ROBOTICSFACILITY, CYBERNETICSCORE, ROBOTICSBAY, ZEALOT, STALKER, COLOSSUS, IMMORTAL } = require('@node-sc2/core/constants/unit-type');
const { EFFECT_CHRONOBOOSTENERGYCOST } = require('@node-sc2/core/constants/ability');
const { PROTOSSGROUNDWEAPONSLEVEL1, PROTOSSSHIELDSLEVEL1, PROTOSSGROUNDARMORSLEVEL1,
  PROTOSSGROUNDWEAPONSLEVEL2, PROTOSSSHIELDSLEVEL2, PROTOSSGROUNDARMORSLEVEL2,
  PROTOSSGROUNDWEAPONSLEVEL3, PROTOSSSHIELDSLEVEL3, PROTOSSGROUNDARMORSLEVEL3,
  EXTENDEDTHERMALLANCE } = require('@node-sc2/core/constants/upgrade');

const { build, upgrade, ability } = taskFunctions;

// money to save for upgrades and builds
const FOR_THE_WATCH = 250

const buildOrder = [
  [1, upgrade(PROTOSSGROUNDWEAPONSLEVEL1)],
  [2, upgrade(PROTOSSSHIELDSLEVEL1)],
  [3, upgrade(PROTOSSGROUNDARMORSLEVEL1)],
  [4, upgrade(PROTOSSGROUNDWEAPONSLEVEL2)],
  [5, upgrade(EXTENDEDTHERMALLANCE)],
  [6, upgrade(PROTOSSSHIELDSLEVEL2)],
  [7, upgrade(PROTOSSSHIELDSLEVEL3)],
  [8, upgrade(PROTOSSGROUNDARMORSLEVEL2)],
  [9, upgrade(PROTOSSGROUNDWEAPONSLEVEL3)],
  [10, upgrade(PROTOSSGROUNDARMORSLEVEL3)],
]

const defaultOptions = {
  state: {
      targetMoney: 0,
      seekAndDestroy: false,
      fullRetaliation: false,
  },
}

const getNumeros = ({minerals, vespene, foodCap, foodUsed, foodArmy, foodWorkers, idleWorkerCount, armyCount, warpGateCount, larvaCount}) => {
  return { minerals, vespene, foodCap, foodUsed, foodArmy, foodWorkers, idleWorkerCount, armyCount, warpGateCount, larvaCount }
}

function canTrain(unitID, agent) {
  return agent.canAfford(unitID) && agent.hasTechFor(unitID)
  // const gotSpace = agent.foodCap - agent.foodUsed - 4; // T.T
}

async function onUnitFinished({ resources }, newBuilding) { 
  console.log(`onUnitFinished in protoss`)
}

async function onGameStart({ resources }) { 
  console.log(`onGameStart in protoss`)
  // Label enemy main
  resources.get().map.getExpansions(Alliance.ENEMY)[0].labels.set('allYourBase', true)
}

async function onStep({ agent, data, resources }) {
  const { units, actions, map } = resources.get();
  const { minerals, vespene, foodArmy } = agent
  
  const idleRoboticFac = units.getById(ROBOTICSFACILITY, { noQueue: true, buildProgress: 1 })[0];
  const idleGateway = units.getById(GATEWAY, { noQueue: true, buildProgress: 1 })[0];
  const spaceLeft = agent.foodCap - agent.foodUsed

  if (minerals < FOR_THE_WATCH && foodArmy > 10) {
    // console.log('for the watch')
    return null
  }

  if(idleRoboticFac && spaceLeft) {
    if (canTrain(COLOSSUS, agent) && spaceLeft >= 5) {
      actions.train(COLOSSUS, idleRoboticFac)
      console.log('training Colossus')
    }
    else if (canTrain(IMMORTAL, agent) && spaceLeft >= 7) {
      actions.train(IMMORTAL, idleRoboticFac)
      console.log('training Immortal')
    }
  }

  if (idleGateway && spaceLeft >= 3) {
    if (canTrain(STALKER, agent)) {
      actions.train(STALKER, idleGateway);
      console.log('training Stalker')
    } else if (canTrain(ZEALOT, agent)) {
      actions.train(ZEALOT, idleGateway);
      console.log('training Zealot')
    }
  }

  if (this.state.seekAndDestroy) {
    const expansions = map.getExpansions()
    console.log(`Watch out! ${expansions.length}`)
  }
}

async function onUnitDestroyed({ agent, resources }, destroyedUnit) {
  console.log(`Too bad for ${destroyedUnit.unitType}`)
  if (destroyedUnit.isTownHall()) {
    console.log('HOLD THE LINE')
    const { actions, map, units } = resources.get()
    const army = units.getCombatUnits()

    return actions.attackMove(army, destroyedUnit.pos, true)
  }
}

async function onEnemyFirstSeen({ agent, resources }, enemyUnit) {
  // if (enemyUnit.labels.has('allYourBase')) {
  if (enemyUnit.isTownHall()) {
    console.log('ALL YOUR BASE ARE BELONG TO US')
    this.setState({ seekAndDestroy: true })
  }
}

async function onUnitCreated({ agent, resources }, newUnit) {
  const { actions, map, units } = resources.get();

  const nexuses = units.getById(NEXUS);
  const busyGW = units.getById(GATEWAY, { noQueue: false, buildProgress: 1 });
  const busyRF = units.getById(ROBOTICSFACILITY, { noQueue: false, buildProgress: 1 });
  
  nexuses.forEach(nexus => {
    if(nexus.energy >= 50) {
      if (busyRF.length > 0) {
        console.log('doing chrono boosty on maquinitas :D')
        const robotThingToBoost = busyRF[Math.floor(Math.random()*busyRF.length)]
        return actions.do(EFFECT_CHRONOBOOSTENERGYCOST, nexus, {target: robotThingToBoost})
      } else if (busyGW.length > 0) {
        console.log('doing chrono boosty on aliens :D')
        const gatewayToBoost = busyGW[Math.floor(Math.random()*busyGW.length)]
        return actions.do(EFFECT_CHRONOBOOSTENERGYCOST, nexus, {target: gatewayToBoost})
      }
    }
  })
}

async function onUpgradeComplete({ resources }, newUpgrade) {
  
}

async function buildComplete() {
  console.log('buildCompleted on protoss')
}

module.exports = createSystem({
    name: 'killemall',
    type: 'build',
    buildOrder,
    defaultOptions,
    onStep,
    onGameStart,
    onUnitFinished,
    onUnitCreated,
    onUpgradeComplete,
    buildComplete,
    onUnitDestroyed,
    onEnemyFirstSeen
});
