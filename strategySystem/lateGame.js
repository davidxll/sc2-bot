// @ts-check
const { createSystem, taskFunctions } = require('@node-sc2/core');
const { Alliance } = require('@node-sc2/core/constants/enums');
const { areEqual, distance } = require('@node-sc2/core/utils/geometry/point');

const { build, upgrade, ability } = taskFunctions;

const buildOrder = []

const defaultOptions = {
  state: {
      seekAndDestroy: false,
      fullRetaliation: false,
      isLameGame: true,
  },
}

let enemyMainPos = {}

function split(array, n, res = []) {
  if(array.length > 0) {
    res.push(array.splice(0, n))
    return split(array, n, res)
  }
  return res
}

async function onUnitFinished({ resources }, newBuilding) { 
  console.log(`onUnitFinished in lateGame`)
}

async function onGameStart({ resources }) { 
  console.log(`Odin. Guide our ships!`)
  enemyMainPos = resources.get().map.getEnemyMain().townhallPosition
  console.log(JSON.stringify(enemyMainPos))
}

async function onStep({ agent, data, resources }) {
  const { units, actions, map } = resources.get();
  const { minerals, vespene, foodArmy } = agent

  if (this.state.seekAndDestroy && !this.state.fullRetaliation) {
    console.log('Searching... seek and destroy!')
    this.setState({ fullRetaliation: true })
    const alives = [...units.getWorkers(), ...units.getCombatUnits()]
    console.log('alives: ', alives.length)
    const expansions = map.getExpansions()
    const quadsNum = Math.floor(alives.length/expansions.length)
    const squads = split(alives, quadsNum)
    console.log('suicide squads: ', JSON.stringify(
      { squads: squads.length, alivesLength: alives.length, expansions: expansions.length, squadOne: squads[0].length },
      null, 2))
    return Promise.all(expansions.map((exp, i) => {
      console.log(JSON.stringify({ x: exp.pos.x, y: exp.pos.y, i }, null, 2))
      return actions.attackMove(squads[i], exp.pos, true)
    }))
  }
}

async function onUnitDestroyed({ agent, resources }, destroyedUnit) {
  const { actions, units, map } = resources.get()
  if (destroyedUnit.isTownhall() && destroyedUnit.isEnemy()) {
    console.log('Distance: ', distance(destroyedUnit.pos, enemyMainPos))
    if (this.state.seekAndDestroy) {
      this.setState({ fullRetaliation: false })
    }
    if (distance(destroyedUnit.pos, enemyMainPos) < 1) {
      console.log('We do away with your kind')
      this.setState({ seekAndDestroy: true })
  
      // const enemyExpansions = map.getExpansions(Alliance.ENEMY)
      // const twerkers = units.getWorkers(true)

      // return Promise.all(enemyExpansions.map((base, i) => {
      //   if (i > 0) {
      //     const bunch = units.getClosest(base.pos, twerkers, twerkers.length/i)
      //     return actions.attackMove(bunch, base.pos, true)
      //   }
      // }))
    }
  } else if (destroyedUnit.isTownhall() && destroyedUnit.alliance === Alliance.SELF) {
    const twerkers = units.getWorkers()
    return actions.attackMove(twerkers, destroyedUnit.pos, true)
  }
}

async function onEnemyFirstSeen({ agent, resources }, enemyUnit) {
  const { actions, units, map } = resources.get()
  // console.log(`Sir, we have a ${enemyUnit.isTownhall()}`)
  // if (enemyUnit.labels.has('allYourBase')) {
    if (enemyUnit.isTownhall()) {
      const idleCombatUnits = units.getCombatUnits().filter(u => u.noQueue);
      return actions.attackMove(idleCombatUnits, enemyUnit.pos, true)
    }
    if (this.state.seekAndDestroy) {
      const army = units.getCombatUnits()
      return actions.attackMove(army, enemyUnit.pos, true)
    }
}

async function onUnitDamaged({ agent, resources }, unit) {
  const { actions, units, map } = resources.get()
    if (unit.isTownhall()) {
      const idleCombatUnits = units.getCombatUnits().filter(u => u.noQueue);
      return actions.attackMove(idleCombatUnits, unit.pos, true)
    }
}

async function onUnitCreated({ agent, resources }, newUnit) {
  // const { actions, map, units } = resources.get();
}

module.exports = createSystem({
    name: 'lateGayme',
    type: 'build',
    buildOrder,
    defaultOptions,
    onStep,
    onGameStart,
    onUnitFinished,
    onUnitCreated,
    onUnitDestroyed,
    onEnemyFirstSeen,
    onUnitDamaged
});
