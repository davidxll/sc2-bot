// @ts-check
const { createSystem, taskFunctions } = require('@node-sc2/core');
const { Alliance } = require('@node-sc2/core/constants/enums');
const { areEqual, distance } = require('@node-sc2/core/utils/geometry/point');
const { STARGATE, OBSERVER, VOIDRAY, CARRIER, ROBOTICSFACILITY } = require('@node-sc2/core/constants/unit-type');
const { getBuildingPlacement } = require('../helpers/placement');

const MAX_RESERVE_SIZE = 28

function split(array, n, res = []) {
  if(array.length > 0) {
    res.push(array.splice(0, n))
    return split(array, n, res)
  }
  return res
}

const defaultOptions = {
  state: {
    armySize: 12,
    army: {
      units: [],
      acc: {}
    }
  },
}

async function onGameStart({ agent, resources }) { 
  const { actions } = resources.get();
  console.log(`onGameStart in Kombat`)
  actions.actionChat({channel:1, message:"u ded"})
}

async function onStep({ agent, resources }) {
  const { units, actions, map } = resources.get();

  const idleCombatUnits = units.getCombatUnits().filter(u => u.noQueue);
  if (idleCombatUnits.length > this.state.armySize || (agent.foodUsed > 190 && idleCombatUnits.length > 10)) {
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
}

async function onUnitHasSwitchedTargets({ agent, resources }, unit, unit2) { 
  // console.log(`onUnitHasSwitchedTargets in Kombat: ${typeof unit2} - ${unit.isCombatUnit()}`)
}

async function onUnitHasDisengaged({ agent, resources }, unit, unit2) { 
  // console.log(`onUnitHasDisengaged in Kombat: ${typeof unit2} - ${unit.isCombatUnit()}`)
}

async function onUnitHasEngaged({ agent, resources }, unit, unit2) { 
  // console.log(`onUnitHasEngaged in Kombat: ${typeof unit2} - ${unit.isCombatUnit()}`)
}

async function onEnemyFirstSeen({ agent, resources }, unit, unit2) { 
  // console.log(`onEnemyFirstSeen in Kombat: ${typeof unit2} - ${unit.isCombatUnit()}`)
}

async function onUnitDestroyed({ agent, resources }, unit, unit2) { 
  // console.log(`onUnitDestroyed in Kombat: ${typeof unit2} - ${unit.isCombatUnit()}`)
}

async function onUnitDamaged({ agent, resources }, unit, unit2) { 
  // console.log(`onUnitDamaged in Kombat: ${typeof unit2} - ${unit.isCombatUnit()}`)
}

async function onUnitFinished({ agent, resources }, unit, unit2) { 
  console.log(`onUnitFinished in Kombat: ${typeof unit2} - ${unit.isCombatUnit()}`)
}

async function onUnitIdle({ agent, resources }, unit, unit2) { 
  console.log(`onUnitIdle in Kombat: ${typeof unit2} - ${unit.isCombatUnit()}`)
}

async function onUnitCreated({ agent, resources }, newUnit) { 
  if (newUnit.isCombatUnit()) {
    let num = 1
    if (this.state.army.acc[newUnit.unitType]) {
      num = this.state.army.acc[newUnit.unitType] + 1
    }
    const armyId = `${newUnit.unitType}_${num}`
    newUnit.armyId = armyId
    const armyUnits = this.state.army.units
    armyUnits.push(newUnit)
    this.setState({ army: {
      units: armyUnits,
      acc: {
        [newUnit.unitType]: num
      }
    } })
    console.log('registered: ', armyId)
    console.log('armyUnits: ', armyUnits.length)
  }
}

async function onNewEffect({ agent, resources }, effect) { 
  // console.log(`onNewEffect in Kombat: ${effect}`)
}

async function onExpiredEffect({ agent, resources }, unit, unit2) { 
  // console.log(`onExpiredEffect in Kombat: ${typeof unit2} - ${unit.isCombatUnit()}`)
}

async function onChatReceived({ agent, resources }, unit, unit2) { 
  console.log(`onChatReceived in Kombat: ${typeof unit2} - ${unit.isCombatUnit()}`)
}

module.exports = createSystem({
    name: 'kombat',
    type: 'build',
    buildOrder: [],
    defaultOptions,
    onGameStart,
    onStep,
    onUnitCreated,
    onUnitFinished,
    onUnitIdle,
    onUnitDamaged,
    onUnitDestroyed,
    onEnemyFirstSeen,
    onUnitHasEngaged,
    onUnitHasDisengaged,
    onUnitHasSwitchedTargets,
    onNewEffect,
    onExpiredEffect,
    onChatReceived,
});
