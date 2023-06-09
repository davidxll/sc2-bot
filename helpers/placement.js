// @ts-check

const { PYLON } = require('@node-sc2/core/constants/unit-type')
const { distance } = require('@node-sc2/core/utils/geometry/point')
const { Alliance } = require('@node-sc2/core/constants/enums');


async function getBuildingPlacement({ resources }, unitId) {

  const { actions, map, units } = resources.get();
  const [main, natural] = map.getExpansions();
  const mainMineralLine = main.areas.mineralLine;

  let placements;

  const pylonsNearProduction = units.getById(PYLON)
    .filter(u => u.buildProgress >= 1)
    .filter(pylon => distance(pylon.pos, main.townhallPosition) < 50);

  if (pylonsNearProduction.length <= 0) return null;

  placements = [...main.areas.placementGrid, ...natural.areas.placementGrid]
    .filter((point) => {
      return (
        (distance(natural.townhallPosition, point) > 4.5) &&
        (pylonsNearProduction.some(p => distance(p.pos, point) < 6.5)) &&
        (mainMineralLine.every(mlp => distance(mlp, point) > 1.5)) &&
        (natural.areas.hull.every(hp => distance(hp, point) > 2)) &&
        (units.getStructures({ alliance: Alliance.SELF })
          .map(u => u.pos)
          .every(eb => distance(eb, point) > 3))
      );
    });

  if (placements.length <= 0) return null;

  return actions.canPlace(unitId, placements);

}

async function getTownhallPlacement({ resources }, unitId) {
  const { actions, map, units } = resources.get();

  const expansionLocation = map.getAvailableExpansions()[0].townhallPosition;

  const foundPosition = await actions.canPlace(unitId, [expansionLocation]);
  // @TODO: if we can't place - try to clear out obstacles (like a burrowed zergling)
  return foundPosition || null
}

module.exports = { getBuildingPlacement, getTownhallPlacement }