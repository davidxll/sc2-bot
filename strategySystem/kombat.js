// @ts-check
const { createSystem, taskFunctions } = require('@node-sc2/core');
const { Alliance, WeaponTargetType } = require('@node-sc2/core/constants/enums');
const { areEqual, distance, getNeighbors } = require('@node-sc2/core/utils/geometry/point');
const { INTERCEPTOR } = require('@node-sc2/core/constants/unit-type');

const MAX_ARMY_SIZE = 28
const INITIAL_ARMY_SIZE = 13
const CHASE_DISTANCE = 25

// export interface Weapon {
//   type?: Weapon_TargetType;
//   damage?: number;
//   damageBonus?: Array<DamageBonus>;
//   attacks?: number;
//   range?: number;
//   speed?: number;
// }

// export interface UnitTypeData {
//   unitId?: number;
//   name?: string;
//   available?: boolean;
//   cargoSize?: number;
//   mineralCost?: number;
//   vespeneCost?: number;
//   foodRequired?: number;
//   foodProvided?: number;
//   abilityId?: number;
//   race?: Race;
//   buildTime?: number;
//   hasVespene?: boolean;
//   hasMinerals?: boolean;
//   sightRange?: number;
//   techAlias?: Array<number>;
//   unitAlias?: number;
//   techRequirement?: number;
//   requireAttached?: boolean;
//   attributes?: Array<Attribute>;
//   movementSpeed?: number;
//   armor?: number;
//   weapons?: Array<Weapon>;
// } .radius ?

const getUnitData = ({shield, health, unitType, engagedTargetTag, noQueue}) => {

}

const defaultOptions = {
  state: {
    armySize: INITIAL_ARMY_SIZE,
    army: [],
    unitTypes: {},
    marching: false
  }
}

async function getMaggots() { 
  return this.state.army.filter(u => u.noQueue)
}

async function onGameStart({ agent, resources }) { 
  const { actions } = resources.get();
  console.log(`onGameStart in Kombat`)
  actions.actionChat({channel:1, message:"u ded"})
}

async function onStep({ agent, resources }) {
  const { units, actions, map } = resources.get();

  const idleCombatUnits = units.getCombatUnits().filter(u => u.noQueue);
  const [enemyMain, enemyNat] = map.getExpansions(Alliance.ENEMY);
  if (idleCombatUnits.length > this.state.armySize || (agent.foodUsed > 190 && idleCombatUnits.length > 10)) {
    // add to our army size, so each attack is slightly larger
    if (this.state.armySize < MAX_ARMY_SIZE) {
      this.setState({ armySize: this.state.armySize + 4, marching: true });
    }
    
    return Promise.all([enemyNat, enemyMain].map((expansion) => {
      console.log('Attack!!')
      return actions.attackMove(idleCombatUnits, expansion.townhallPosition, true);
    }));
  }

  if (this.state.marching) {
    const enemyMainPos = enemyMain.townhallPosition
    const myMainPos = units.getBases(Alliance.SELF)[0].townhallPosition
    let slowest = Infinity
    let backestDist = Infinity
    let frontestDist = Infinity
    let backestUnit = {}
    let frontestUnit = {}
    const army = this.state.army
    const unitTypes = this.state.unitTypes
    for (let unitData of Object.values(unitTypes)) {
      const { movementSpeed } = unitData
      if (movementSpeed < slowest) {
        slowest = movementSpeed
      }
    }
    for (let unit of army) {
      const { pos } = unit
      const toBase = distance(pos, myMainPos)
      const toEnemy = distance(pos, enemyMainPos)
      if (toBase < backestDist) {
        backestDist = toBase
        backestUnit = unit
      }
      if (toEnemy < frontestDist) {
        frontestDist = toEnemy
        frontestUnit = unit
      }
    }
    for (let unit of army) {
      const { healthMax, health } = unit
      if (unit.unitId !== backestUnit.unitId) {
        await actions.attackMove(unit, backestUnit.pos, true);
      }
      if (healthMax > health) {
        console.log('injured')
      }
    }
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
  if(unit.getLife() < 100) {
    const better = this.state.army
    const faster = better.filter(u => u.movementSpeed > unit.movementSpeed)
    const stronger = faster.filter(u => distance(u.pos, unit.pos) <= CHASE_DISTANCE)
    if (stronger.length > 0) {
      const { actions } = resources.get();
      console.log('show no ruth, ', stronger.length)
      return actions.attackMove(stronger, unit, false);
    }
  }
}

async function onUnitDamaged({ agent, resources }, unit) {
  if (!unit.isCombatUnit() && unit.alliance === Alliance.SELF && unit.unitType !== INTERCEPTOR) {
    const maggots = await getMaggots()
    console.log('me atacaron a un perrito: ', maggots.length)
    const { actions } = resources.get()
    if (maggots.length > 0) {
      return actions.attackMove(maggots, unit.pos, true)
    }
  } else if(unit.alliance === Alliance.SELF) {

  }
}

async function onUnitFinished({ agent, resources }, unit, unit2) {
  // console.log(`onUnitFinished in Kombat: ${typeof unit2} - ${unit.isCombatUnit()}`)
}

async function onUnitIdle({ agent, resources }, unit, unit2) {
  // console.log(`onUnitIdle in Kombat: ${typeof unit2} - ${unit.isCombatUnit()}`)
}

async function onUnitCreated({ agent, resources, data }, newUnit) { 
  if (newUnit.isCombatUnit()) {
    let count = 1
    const unitData = data.getUnitTypeData(newUnit.unitType)
    if (this.state.unitTypes[newUnit.unitType]) {
      count = this.state.unitTypes[newUnit.unitType].count + 1
    }
    const armyUnits = this.state.army
    armyUnits.push(newUnit)
    this.setState({
      army: armyUnits,
      unitTypes: {
        [newUnit.unitType]: {
          count,
          unitData
        }
      }
    })

    // console.log(JSON.stringify({unitData}, null, 2))
    console.log('newUnit.tag: ', newUnit.tag)
    console.log('armyUnits: ', armyUnits.length)
  }
}

async function onUnitDestroyed({ agent, resources, data }, deadUnit, unit2) {
  // console.log(`onUnitDestroyed in Kombat: ${typeof unit2} - ${unit.isCombatUnit()}`)
  if (deadUnit.isCombatUnit()) {
    const armyUnits = this.state.army
    const deadManIndex = armyUnits.findIndex(el => el.tag === deadUnit.tag)

    if (deadManIndex !== -1) {
      armyUnits.splice(deadManIndex, 1);
    }

    let count = 0
    if (this.state.unitTypes[deadUnit.unitType]) {
      count = this.state.unitTypes[deadUnit.unitType] - 1
    }

    this.setState({
      army: armyUnits,
      unitTypes: {
        [deadUnit.unitType]: { count }
      },
      marching: false
    })
    console.log('deadmanwalking: ', deadUnit.tag)
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
