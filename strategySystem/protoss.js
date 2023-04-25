// @ts-check
const { createSystem, taskFunctions } = require('@node-sc2/core');
const { Alliance } = require('@node-sc2/core/constants/enums');
const { GATEWAY, NEXUS, ROBOTICSFACILITY, CYBERNETICSCORE, ROBOTICSBAY, ZEALOT, STALKER, COLOSSUS, IMMORTAL } = require('@node-sc2/core/constants/unit-type');
const { EFFECT_CHRONOBOOSTENERGYCOST } = require('@node-sc2/core/constants/ability');
const { PROTOSSGROUNDWEAPONSLEVEL1, PROTOSSSHIELDSLEVEL1, PROTOSSGROUNDWEAPONSLEVEL2, PROTOSSSHIELDSLEVEL2, PROTOSSSHIELDSLEVEL3 } = require('@node-sc2/core/constants/upgrade');

const { build, upgrade, ability } = taskFunctions;

const wishList = [
  [45, upgrade(PROTOSSGROUNDWEAPONSLEVEL1)],
  [46, upgrade(PROTOSSSHIELDSLEVEL1)],
  [48, upgrade(PROTOSSGROUNDWEAPONSLEVEL2)],
  [49, upgrade(PROTOSSSHIELDSLEVEL2)],
  [51, upgrade(PROTOSSSHIELDSLEVEL3)],
]

const defaultOptions = {
  state: {
      gay: false
  },
}

const getNumeros = ({minerals, vespene, foodCap, foodUsed, foodArmy, foodWorkers, idleWorkerCount, armyCount, warpGateCount, larvaCount}) => {
  return { minerals, vespene, foodCap, foodUsed, foodArmy, foodWorkers, idleWorkerCount, armyCount, warpGateCount, larvaCount }
}

async function onUnitFinished({ resources }, newBuilding) { 
  console.log(`onUnitFinished in protoss`)
}

async function onGameStart() { 
  console.log(`onGameStart in protoss`)
}

async function onStep({ agent, data, resources }) {
  const { units, actions, map } = resources.get();
  const { minerals, vespene } = agent
  
  const idleRoboticFac = units.getById(ROBOTICSFACILITY, { noQueue: true, buildProgress: 1 })[0];
  // all gateways that are done building and idle
  const idleGateway = units.getById(GATEWAY, { noQueue: true, buildProgress: 1 })[0];
  
  const hasCyberneticCore = !!units.getById(CYBERNETICSCORE, { buildProgress: 1 })[0]
  const hasRoboticsBay = !!units.getById(ROBOTICSBAY, { buildProgress: 1 })[0]

  if(idleRoboticFac) {
    if (agent.canAfford(COLOSSUS) && hasRoboticsBay) {
      actions.train(COLOSSUS, idleRoboticFac)
      console.log('training Colossus')
    }
    else if (agent.canAfford(IMMORTAL)) {
      actions.train(IMMORTAL, idleRoboticFac)
      console.log('training Immortal')
    }
  }

  if (idleGateway) {
    if (agent.canAfford(STALKER) && hasCyberneticCore) {
      actions.train(STALKER, idleGateway);
      console.log('training Stalker')
    } else if (agent.canAfford(ZEALOT)) {
      actions.train(ZEALOT, idleGateway);
      console.log('training Zealot')
    }
  }
}

async function onUnitCreated({ resources }, newUnit) {
  // add `map` to the resources we're getting
  const { actions, map, units } = resources.get();

  const nexuses = units.getById(NEXUS); // nexus.energy
  const busyGW = units.getById(GATEWAY, { noQueue: false, buildProgress: 1 });
  
  nexuses.forEach(nexus => {
    if (busyGW.length > 0 && nexus.abilityAvailable(EFFECT_CHRONOBOOSTENERGYCOST)) {
      const gatewayToBoost = busyGW[Math.floor(Math.random()*busyGW.length)]
      actions.do(EFFECT_CHRONOBOOSTENERGYCOST, nexus, {target: gatewayToBoost})
      console.log('doing chrono boosty :D ')
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
    buildOrder: wishList,
    defaultOptions,
    onStep,
    onGameStart,
    onUnitFinished,
    onUnitCreated,
    onUpgradeComplete,
    buildComplete
});
