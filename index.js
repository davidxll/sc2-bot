const { createAgent, createEngine, createPlayer } = require('@node-sc2/core');
const { Difficulty, Race } = require('@node-sc2/core/constants/enums');
const protossSupplySystem = require('./collectionSystem/protossupply');
const baseline = require('./buildOrdersSystem/baseline');
const leMain = require('./strategySystem/protoss')
const lateGayme = require('./strategySystem/lateGame')
const kombat = require('./strategySystem/kombat')

const bot = createAgent();

const engine = createEngine();

engine.connect().then(() => {
    return engine.runGame('WaterfallAIE', [
        createPlayer({ race: Race.PROTOSS }, bot),
        createPlayer({ race: Race.RANDOM, difficulty: Difficulty.HARDER }),
    ]);
});

bot.use([protossSupplySystem, baseline, leMain, lateGayme, kombat]);
