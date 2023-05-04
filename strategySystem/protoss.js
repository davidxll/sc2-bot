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
      // seekAndDestroy: false,
      // fullRetaliation: false,
  },
}

// const enemyMainPos = {}

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

  if (idleGateway && spaceLeft >= 4) {
    try {
      if (canTrain(STALKER, agent)) {
        console.log('training Stalker')
        await actions.train(STALKER, idleGateway);
      } else if (canTrain(ZEALOT, agent)) {
        console.log('training Zealot')
        await actions.train(ZEALOT, idleGateway);
      }
    } catch (err) {
      console.log('WTF dude ', err.message)
      return null
    }
  }

  if(idleRoboticFac && spaceLeft) {
    try {
      if (canTrain(COLOSSUS, agent) && spaceLeft >= 8) {
        console.log('training Colossus')
        await actions.train(COLOSSUS, idleRoboticFac)
      }
      else if (canTrain(IMMORTAL, agent) && spaceLeft >= 6) {
        console.log('training Immortal')
        await actions.train(IMMORTAL, idleRoboticFac)
      }
    } catch (err) {
      console.log('that fucking prick ', err.message)
      return undefined
    }
  }

  // if (this.state.seekAndDestroy) {
  //   const expansions = map.getExpansions()
  //   console.log(`Watch out! ${expansions.length}`)
  // }
}

async function onUnitDestroyed({ agent, resources }, destroyedUnit) {
  // console.log(`Too bad for ${destroyedUnit.unitType} - ${destroyedUnit.isTownhall()}`)
  // if (destroyedUnit.isTownhall() && destroyedUnit.isEnemy()) {
  //   this.setState({ lateGame: true })

  //   console.log('HOLD THE LINE - ', destroyedUnit.labels.has('allYourBase'))
  //   console.log('HOLD THE LINE 2 - ', destroyedUnit.labels.hasOwnProperty('allYourBase'))
  //   const { actions, units, map } = resources.get()
  //   // const enemyMain = units.withLabel('allYourBase')
    
  //   if (destroyedUnit.labels.has('allYourBase')) {
  //     map.getExpansions(Alliance.ENEMY).forEach((base, i) => {
  //       const bunch = units.getClosest(base.pos, units, units/i)
  //       actions.attackMove(bunch, base.pos, true)
  //     })
  //   }

  // }
}

async function onEnemyFirstSeen({ agent, resources }, enemyUnit) {
  // console.log(`Sir, we have a ${enemyUnit.isTownhall()}`)
  // if (enemyUnit.labels.has('allYourBase')) {
  //   if (enemyUnit.isTownhall()) {
  //     const { actions, units, map } = resources.get()
  //     console.log('ALL YOUR BASE ARE BELONG TO US')
  //     const [enemyMain] = map.getExpansions(Alliance.ENEMY);
  //     const army = units.getCombatUnits()
  //     console.log(`ALL TO ${enemyMain.pos}!`)
  //     actions.attackMove(army, enemyMain.pos, true)
  //   this.setState({ seekAndDestroy: true })
  // }
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
