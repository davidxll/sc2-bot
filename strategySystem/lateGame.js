// @ts-check
const { createSystem, taskFunctions } = require('@node-sc2/core');
const { Alliance } = require('@node-sc2/core/constants/enums');
const { areEqual, distance } = require('@node-sc2/core/utils/geometry/point');
const { STARGATE, OBSERVER, VOIDRAY, CARRIER, ROBOTICSFACILITY } = require('@node-sc2/core/constants/unit-type');
const getBuildingPlacement = require('../helpers/placement');

const { build, train } = taskFunctions;

const buildOrder = []

const defaultOptions = {
  state: {
      seekAndDestroy: false,
      fullRetaliation: false,
      isLameGame: false,
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

function canTrainOrBuild(unitID, agent) {
  return agent.canAfford(unitID) && agent.hasTechFor(unitID)
}

async function onUnitFinished({ resources }, newBuilding) { 
  console.log(`onUnitFinished in lateGame`)
}

async function onGameStart({ agent, resources }) { 
  console.log(`Odin. Guide our ships!`)
  console.log(typeof agent.pauseBuild)
  enemyMainPos = resources.get().map.getEnemyMain().townhallPosition
  console.log(JSON.stringify(enemyMainPos))
  // SystemObject
}

async function onStep(world) {
  const { agent, data, resources } = world
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
      { squads: squads.length, expansions: expansions.length, squadOne: squads[0].length },
      null, 2))
    for (const [i, v] of expansions.entries()) {
      console.log('Expansion info: ', JSON.stringify({ x: v.townhallPosition.x, y: v.townhallPosition.y, i, squadLength: squads[i].length }, null, 2))
    }
    for (const [i, v] of expansions.entries()) {
      console.log('Expansion data: ', JSON.stringify({ x: v.townhallPosition.x, y: v.townhallPosition.y, i, squadLength: squads[i].length }, null, 2))
      await actions.attackMove(squads[i], v.townhallPosition, true)
    }
    // return Promise.all(expansions.forEach((exp, i) => {
    //   console.log('Expansion data: ', JSON.stringify({ x: exp.pos.x, y: exp.pos.y, i }, null, 2))
    //   return actions.attackMove(squads[i], exp.pos, true)
    // }))
  }

  if (this.state.isLameGame) {
    const starGays = units.getById(STARGATE);
    const idleStarGay = units.getById(STARGATE, { noQueue: true, buildProgress: 1 })[0];
    const spaceLeft = agent.foodCap - agent.foodUsed

    if (idleStarGay && spaceLeft > 6) {
      try {
        if (canTrainOrBuild(CARRIER, agent)) {
          console.log('training Carriero')
          await actions.train(CARRIER, idleStarGay);
        } else if (canTrainOrBuild(VOIDRAY, agent)) {
          console.log('training Ray of Void')
          await actions.train(VOIDRAY, idleStarGay);
        }
      } catch (err) {
        console.log('WTF at airport ', err.message)
        return null
      }
    }

    if (starGays.length < 2) {
      const placement = getBuildingPlacement(world)
      if (placement) {
        try {
          console.log('building stargay')
          await actions.build(STARGATE, placement);
        } catch (err) {
          console.log('coño stargay ', err.message)
        }
      }
    }

    const observadores = units.getById(OBSERVER)
    const idleRoboticFac = units.getById(ROBOTICSFACILITY, { noQueue: true, buildProgress: 1 })[0];
    if(observadores.length < 1 && idleRoboticFac && canTrainOrBuild(OBSERVER, agent) && spaceLeft > 1) {
      try {
        console.log('training observador')
        await actions.train(OBSERVER, idleRoboticFac);
      } catch (err) {
        console.log('coño observador ', err.message)
        return null
      }
    }
  }

  if (agent.foodCap > 150 && !this.state.isLameGame) {
    this.setState({ isLameGame: true });
    console.log('this is lame game')
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
    const idles = units.getIdle()
    return actions.attackMove(idles, destroyedUnit.pos, true)
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

async function buildComplete({ agent, resources }, gameloop) {
  console.log('WTF')
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
    onUnitDamaged,
    buildComplete
});
