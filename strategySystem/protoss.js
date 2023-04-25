// @ts-check
const { createSystem, taskFunctions } = require('@node-sc2/core');
const { Alliance } = require('@node-sc2/core/constants/enums');
const { GATEWAY, NEXUS, ROBOTICSFACILITY, CYBERNETICSCORE, ROBOTICSBAY, ZEALOT, STALKER, COLOSSUS, IMMORTAL } = require('@node-sc2/core/constants/unit-type');
const { EFFECT_CHRONOBOOSTENERGYCOST } = require('@node-sc2/core/constants/ability');
const { PROTOSSGROUNDWEAPONSLEVEL1, PROTOSSSHIELDSLEVEL1, PROTOSSGROUNDARMORSLEVEL1, PROTOSSGROUNDWEAPONSLEVEL2, PROTOSSSHIELDSLEVEL2, PROTOSSSHIELDSLEVEL3 } = require('@node-sc2/core/constants/upgrade');

const { build, upgrade, ability } = taskFunctions;

const buildOrder = [
  [45, upgrade(PROTOSSGROUNDWEAPONSLEVEL1)],
  [46, upgrade(PROTOSSSHIELDSLEVEL1)],
  [50, upgrade(PROTOSSGROUNDARMORSLEVEL1)],
  [58, upgrade(PROTOSSGROUNDWEAPONSLEVEL2)],
  [65, upgrade(PROTOSSSHIELDSLEVEL2)],
  [78, upgrade(PROTOSSSHIELDSLEVEL3)],
]

const defaultOptions = {
  state: {
      targetMoney: 0
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
    // hasTechFor
    if (agent.canAfford(COLOSSUS) && hasRoboticsBay) {
      actions.train(COLOSSUS, idleRoboticFac)
      console.log('training Colossus')
    }
    else if (agent.canAfford(IMMORTAL)) {
      actions.train(IMMORTAL, idleRoboticFac)
      console.log('training Immortal')
    }
  }

  // if (idleGateway && minerals > this.state.targetMoney) {
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

async function onUnitCreated(world, newUnit) {
  // add `map` to the resources we're getting
  const { actions, map, units } = world.resources.get();

  const nexuses = units.getById(NEXUS);
  const busyGW = units.getById(GATEWAY, { noQueue: false, buildProgress: 1 });
  const busyRF = units.getById(ROBOTICSFACILITY, { noQueue: false, buildProgress: 1 });
  
  nexuses.forEach(nexus => {
    if(nexus.energy >= 50) {
      if (busyRF.length > 0) {
        const robotThingToBoost = busyRF[Math.floor(Math.random()*busyRF.length)]
        actions.do(EFFECT_CHRONOBOOSTENERGYCOST, nexus, {target: robotThingToBoost})
        console.log('doing chrono boosty :D')
      } else if (busyGW.length > 0) {
        const gatewayToBoost = busyGW[Math.floor(Math.random()*busyGW.length)]
        actions.do(EFFECT_CHRONOBOOSTENERGYCOST, nexus, {target: gatewayToBoost})
      }
    }
  })

  if (this.state.targetMoney > world.agent.minerals) {
    this.setState({targetMoney: this.state.targetMoney + 50})
    console.log('we rich bich')
  }
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
    buildComplete
});
