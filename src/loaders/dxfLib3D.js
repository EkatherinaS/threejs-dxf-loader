import {
  Vector3,
  Loader,
  FileLoader,
  LineBasicMaterial,
  BufferGeometry,
  Line,
  Vector2,
} from "three";

var AUTO_CAD_COLOR_INDEX = [
  0, 16711680, 16776960, 65280, 65535, 255, 16711935, 16777215, 8421504,
  12632256, 16711680, 16744319, 13369344, 13395558, 10027008, 10046540, 8323072,
  8339263, 4980736, 4990502, 16727808, 16752511, 13382400, 13401958, 10036736,
  10051404, 8331008, 8343359, 4985600, 4992806, 16744192, 16760703, 13395456,
  13408614, 10046464, 10056268, 8339200, 8347455, 4990464, 4995366, 16760576,
  16768895, 13408512, 13415014, 10056192, 10061132, 8347392, 8351551, 4995328,
  4997670, 16776960, 16777087, 13421568, 13421670, 10000384, 10000460, 8355584,
  8355647, 5000192, 5000230, 12582656, 14679935, 10079232, 11717734, 7510016,
  8755276, 6258432, 7307071, 3755008, 4344870, 8388352, 12582783, 6736896,
  10079334, 5019648, 7510092, 4161280, 6258495, 2509824, 3755046, 4194048,
  10485631, 3394560, 8375398, 2529280, 6264908, 2064128, 5209919, 1264640,
  3099686, 65280, 8388479, 52224, 6736998, 38912, 5019724, 32512, 4161343,
  19456, 2509862, 65343, 8388511, 52275, 6737023, 38950, 5019743, 32543,
  4161359, 19475, 2509871, 65407, 8388543, 52326, 6737049, 38988, 5019762,
  32575, 4161375, 19494, 2509881, 65471, 8388575, 52377, 6737074, 39026,
  5019781, 32607, 4161391, 19513, 2509890, 65535, 8388607, 52428, 6737100,
  39064, 5019800, 32639, 4161407, 19532, 2509900, 49151, 8380415, 39372,
  6730444, 29336, 5014936, 24447, 4157311, 14668, 2507340, 32767, 8372223,
  26316, 6724044, 19608, 5010072, 16255, 4153215, 9804, 2505036, 16383, 8364031,
  13260, 6717388, 9880, 5005208, 8063, 4149119, 4940, 2502476, 255, 8355839,
  204, 6710988, 152, 5000344, 127, 4145023, 76, 2500172, 4129023, 10452991,
  3342540, 8349388, 2490520, 6245528, 2031743, 5193599, 1245260, 3089996,
  8323327, 12550143, 6684876, 10053324, 4980888, 7490712, 4128895, 6242175,
  2490444, 3745356, 12517631, 14647295, 10027212, 11691724, 7471256, 8735896,
  6226047, 7290751, 3735628, 4335180, 16711935, 16744447, 13369548, 13395660,
  9961624, 9981080, 8323199, 8339327, 4980812, 4990540, 16711871, 16744415,
  13369497, 13395634, 9961586, 9981061, 8323167, 8339311, 4980793, 4990530,
  16711807, 16744383, 13369446, 13395609, 9961548, 9981042, 8323135, 8339295,
  4980774, 4990521, 16711743, 16744351, 13369395, 13395583, 9961510, 9981023,
  8323103, 8339279, 4980755, 4990511, 3355443, 5987163, 8684676, 11382189,
  14079702, 16777215,
];

var FaceParser = /** @class */ (function () {
  function FaceParser() {
    this.ForEntityName = "3DFACE";
  }

  FaceParser.prototype.parseEntity = function (scanner, curr) {
    var entity = {
      type: curr.value,
      vertices: [],
    };
    curr = scanner.next();
    while (!scanner.isEOF()) {
      if (curr.code === 0) {
        break;
      }
      switch (curr.code) {
        case 70: // 1 = Closed shape, 128 = plinegen?, 0 = default
          entity.shape = (curr.value & 1) === 1;
          entity.hasContinuousLinetypePattern = (curr.value & 128) === 128;
          break;
        case 10: // X coordinate of point
          entity.vertices = parse3dFaceVertices(scanner, curr);
          curr = scanner.lastReadGroup;
          break;
        default:
          checkCommonEntityProperties(entity, curr, scanner);
          break;
      }
      curr = scanner.next();
    }
    return entity;
  };
  return FaceParser;
})();

var ArcParser = /** @class */ (function () {
  function ArcParser() {
    this.ForEntityName = "ARC";
  }

  ArcParser.prototype.parseEntity = function (scanner, curr) {
    var entity = { type: curr.value };
    curr = scanner.next();
    while (!scanner.isEOF()) {
      if (curr.code === 0) {
        break;
      }
      switch (curr.code) {
        case 10: // X coordinate of point
          entity.center = parsePoint(scanner);
          break;
        case 40: // radius
          entity.radius = curr.value;
          break;
        case 50: // start angle
          entity.startAngle = (Math.PI / 180) * curr.value;
          break;
        case 51: // end angle
          entity.endAngle = (Math.PI / 180) * curr.value;
          entity.angleLength = entity.endAngle - entity.startAngle; // angleLength is deprecated
          break;
        case 210:
          entity.extrusionDirectionX = curr.value;
          break;
        case 220:
          entity.extrusionDirectionY = curr.value;
          break;
        case 230:
          entity.extrusionDirectionZ = curr.value;
          break;
        default: // ignored attribute
          checkCommonEntityProperties(entity, curr, scanner);
          break;
      }
      curr = scanner.next();
    }
    return entity;
  };
  return ArcParser;
})();

var AttDefParser = /** @class */ (function () {
  function AttDefParser() {
    this.ForEntityName = "ATTDEF";
  }

  AttDefParser.prototype.parseEntity = function (scanner, curr) {
    var entity = {
      type: curr.value,
      scale: 1,
      textStyle: "STANDARD",
    };
    curr = scanner.next();
    while (!scanner.isEOF()) {
      if (curr.code === 0) {
        break;
      }
      switch (curr.code) {
        case 1:
          entity.text = curr.value;
          break;
        case 2:
          entity.tag = curr.value;
          break;
        case 3:
          entity.prompt = curr.value;
          break;
        case 7:
          entity.textStyle = curr.value;
          break;
        case 10: // X coordinate of 'first alignment point'
          entity.startPoint = parsePoint(scanner);
          break;
        case 11: // X coordinate of 'second alignment point'
          entity.endPoint = parsePoint(scanner);
          break;
        case 39:
          entity.thickness = curr.value;
          break;
        case 40:
          entity.textHeight = curr.value;
          break;
        case 41:
          entity.scale = curr.value;
          break;
        case 50:
          entity.rotation = curr.value;
          break;
        case 51:
          entity.obliqueAngle = curr.value;
          break;
        case 70:
          entity.invisible = !!(curr.value & 0x01);
          entity.constant = !!(curr.value & 0x02);
          entity.verificationRequired = !!(curr.value & 0x04);
          entity.preset = !!(curr.value & 0x08);
          break;
        case 71:
          entity.backwards = !!(curr.value & 0x02);
          entity.mirrored = !!(curr.value & 0x04);
          break;
        case 72:
          // TODO: enum values?
          entity.horizontalJustification = curr.value;
          break;
        case 73:
          entity.fieldLength = curr.value;
          break;
        case 74:
          // TODO: enum values?
          entity.verticalJustification = curr.value;
          break;
        case 100:
          break;
        case 210:
          entity.extrusionDirectionX = curr.value;
          break;
        case 220:
          entity.extrusionDirectionY = curr.value;
          break;
        case 230:
          entity.extrusionDirectionZ = curr.value;
          break;
        default:
          checkCommonEntityProperties(entity, curr, scanner);
          break;
      }
      curr = scanner.next();
    }
    return entity;
  };
  return AttDefParser;
})();

var CircleParser = /** @class */ (function () {
  function CircleParser() {
    this.ForEntityName = "CIRCLE";
  }

  CircleParser.prototype.parseEntity = function (scanner, curr) {
    var entity = { type: curr.value };
    curr = scanner.next();
    while (!scanner.isEOF()) {
      if (curr.code === 0) {
        break;
      }
      switch (curr.code) {
        case 10: // X coordinate of point
          entity.center = parsePoint(scanner);
          break;
        case 40: // radius
          entity.radius = curr.value;
          break;
        case 50: // start angle
          entity.startAngle = (Math.PI / 180) * curr.value;
          break;
        case 51: // end angle
          var endAngle = (Math.PI / 180) * curr.value;
          if (endAngle < entity.startAngle) {
            entity.angleLength = endAngle + 2 * Math.PI - entity.startAngle;
          } else {
            entity.angleLength = endAngle - entity.startAngle;
          }
          entity.endAngle = endAngle;
          break;
        default: // ignored attribute
          checkCommonEntityProperties(entity, curr, scanner);
          break;
      }
      curr = scanner.next();
    }
    return entity;
  };
  return CircleParser;
})();

var DimensionParser = /** @class */ (function () {
  function DimensionParser() {
    this.ForEntityName = "DIMENSION";
  }

  DimensionParser.prototype.parseEntity = function (scanner, curr) {
    var entity = { type: curr.value };
    curr = scanner.next();
    while (!scanner.isEOF()) {
      if (curr.code === 0) {
        break;
      }
      switch (curr.code) {
        case 2: // Referenced block name
          entity.block = curr.value;
          break;
        case 10: // X coordinate of 'first alignment point'
          entity.anchorPoint = parsePoint(scanner);
          break;
        case 11:
          entity.middleOfText = parsePoint(scanner);
          break;
        case 12: // Insertion point for clones of a dimension
          entity.insertionPoint = parsePoint(scanner);
          break;
        case 13: // Definition point for linear and angular dimensions
          entity.linearOrAngularPoint1 = parsePoint(scanner);
          break;
        case 14: // Definition point for linear and angular dimensions
          entity.linearOrAngularPoint2 = parsePoint(scanner);
          break;
        case 15: // Definition point for diameter, radius, and angular dimensions
          entity.diameterOrRadiusPoint = parsePoint(scanner);
          break;
        case 16: // Point defining dimension arc for angular dimensions
          entity.arcPoint = parsePoint(scanner);
          break;
        case 70: // Dimension type
          entity.dimensionType = curr.value;
          break;
        case 71: // 5 = Middle center
          entity.attachmentPoint = curr.value;
          break;
        case 42: // Actual measurement
          entity.actualMeasurement = curr.value;
          break;
        case 1: // Text entered by user explicitly
          entity.text = curr.value;
          break;
        case 50: // Angle of rotated, horizontal, or vertical dimensions
          entity.angle = curr.value;
          break;
        default: // check common entity attributes
          checkCommonEntityProperties(entity, curr, scanner);
          break;
      }
      curr = scanner.next();
    }
    return entity;
  };
  return DimensionParser;
})();

var MLeaderParser = /** @class */ (function () {
  function MLeaderParser() {
    this.ForEntityName = "MULTILEADER";
  }

  MLeaderParser.prototype.parseEntity = function (scanner, curr) {
    var entity = { type: curr.value };
    entity.contextData = {
      leaders: [],
    };
    curr = scanner.next();

    function parseCommonData() {
      while (!scanner.isEOF()) {
        switch (curr.code) {
          case 0: // END
            return;
          case 340:
            entity.leaderStyleId = curr.value;
            break;
          case 170:
            entity.leaderLineType = curr.value;
            break;
          case 91:
            entity.leaderLineColor = curr.value;
            break;
          case 341:
            entity.leaderLineTypeId = curr.value;
            break;
          case 171:
            entity.leaderLineWeight = curr.value;
            break;
          case 41:
            entity.doglegLength = curr.value;
            break;
          case 290:
            entity.enableLanding = curr.value;
            break;
          case 291:
            entity.enableDogLeg = curr.value;
            break;
          case 342:
            entity.arrowHeadId = curr.value;
            break;
          case 42:
            entity.arrowHeadSize = curr.value;
            break;
          case 172:
            entity.contentType = curr.value;
            break;
          case 173:
            entity.textLeftAttachmentType = curr.value;
            break;
          case 95:
            entity.textLeftAttachmentType = curr.value;
            break;
          case 174:
            entity.textAngleType = curr.value;
            break;
          case 175:
            entity.textAlignmentType = curr.value;
            break;
          case 343:
            entity.textStyleId = curr.value;
            break;
          case 92:
            entity.textColor = curr.value;
            break;
          case 292:
            entity.enableFrameText = curr.value;
            break;
          case 344:
            entity.blockContentId = curr.value;
            break;
          case 93:
            entity.blockContentColor = curr.value;
            break;
          case 10:
            entity.blockContentScale = parsePoint(scanner);
            break;
          case 43:
            entity.blockContentRotation = curr.value;
            break;
          case 176:
            entity.blockContentConnectionType = curr.value;
            break;
          case 293:
            entity.enableAnotationScale = curr.value;
            break;
          case 94:
            entity.arrowHeadIndex = curr.value;
            break;
          case 330:
            entity.blockAttributeId = curr.value;
            break;
          case 177:
            entity.blockAttributeIndex = curr.value;
            break;
          case 44:
            entity.blockAttributeWidth = curr.value;
            break;
          case 302:
            entity.blockAttributeTextString = curr.value;
            break;
          case 294:
            entity.textDirectionNegative = curr.value;
            break;
          case 178:
            entity.textAlignInIPE = curr.value;
            break;
          case 179:
            entity.textAttachmentPoint = curr.value;
            break;
          case 271:
            entity.textAttachmentDirectionMText = curr.value;
            break;
          case 272:
            entity.textAttachmentDirectionBottom = curr.value;
            break;
          case 273:
            entity.textAttachmentDirectionTop = curr.value;
            break;
          case 300: // START CONTEXT_DATA
            parseContextData();
            break;
          default:
            checkCommonEntityProperties(entity, curr, scanner);
            break;
        }
        curr = scanner.next();
      }
    }

    function parseContextData() {
      while (!scanner.isEOF()) {
        switch (curr.code) {
          case 40:
            entity.contextData.contentScale = curr.value;
            break;
          case 10:
            entity.contextData.contentBasePosition = parsePoint(scanner);
            break;
          case 145:
            entity.contextData.landingGap = curr.value;
            break;
          case 290:
            entity.contextData.hasMText = curr.value;
            break;
          case 304:
            entity.contextData.defaultTextContents = curr.value;
            break;
          case 11:
            entity.contextData.textNormalDirection = parsePoint(scanner);
            break;
          case 12:
            entity.contextData.textLocation = parsePoint(scanner);
            break;
          case 13:
            entity.contextData.textDirection = parsePoint(scanner);
            break;
          case 140:
            entity.contextData.arrowHeadSize = curr.value;
            break;
          case 41:
            entity.contextData.textHeight = curr.value;
            break;
          case 42:
            entity.contextData.textRotation = curr.value;
            break;
          case 43:
            entity.contextData.textWidth = curr.value;
            break;
          case 44:
            entity.contextData.textHeight = curr.value;
            break;
          case 45:
            entity.contextData.textLineSpacingFactor = curr.value;
            break;
          case 90:
            entity.contextData.textColor = curr.value;
            break;
          case 170:
            entity.contextData.textLineSpacingStyle = curr.value;
            break;
          case 171:
            entity.contextData.textAttachment = curr.value;
            break;
          case 172:
            entity.contextData.textFlowDirection = curr.value;
            break;
          case 141:
            entity.contextData.textBackgroundScaleFactor = curr.value;
            break;
          case 92:
            entity.contextData.textBackgroundTransparency = curr.value;
            break;
          case 291:
            entity.contextData.textBackgroundColorOn = curr.value;
            break;
          case 292:
            entity.contextData.textBackgroundFillOn = curr.value;
            break;
          case 293:
            entity.contextData.textUseAutoHeight = curr.value;
            break;
          case 173:
            entity.contextData.textColumnType = curr.value;
            break;
          case 142:
            entity.contextData.textColumnWidth = curr.value;
            break;
          case 143:
            entity.contextData.textColumnGutterWidth = curr.value;
            break;
          case 144:
            entity.contextData.textColumnHeight = curr.value;
            break;
          case 295:
            entity.contextData.textUseWordBreak = curr.value;
            break;
          case 296:
            entity.contextData.hasBlock = curr.value;
            break;
          case 341:
            entity.contextData.blockContentId = curr.value;
            break;
          case 14:
            entity.contextData.blockContentNormalDirection =
              parsePoint(scanner);
            break;
          case 15:
            entity.contextData.blockContentPosition = parsePoint(scanner);
            break;
          case 16:
            entity.contextData.blockContentScale = curr.value;
            break;
          case 46:
            entity.contextData.blockContentRotation = curr.value;
            break;
          case 93:
            entity.contextData.blockContentColor = curr.value;
            break;
          case 47:
            entity.contextData.blockTransformationMatrix = parseMatrix(
              scanner,
              47
            );
            break;
          case 110:
            entity.contextData.planeOriginPoint = parsePoint(scanner);
            break;
          case 111:
            entity.contextData.planeXAxisDirection = parsePoint(scanner);
            break;
          case 112:
            entity.contextData.planeYAxisDirection = parsePoint(scanner);
            break;
          case 297:
            entity.contextData.planeNormalReversed = curr.value;
            break;
          case 301: // END CONTEXT_DATA
            return;
          case 302: // START LEADER
            parseLeaderData();
            break;
          default:
            break;
        }
        curr = scanner.next();
      }
    }

    function parseLeaderData() {
      var leader = {
        leaderLines: [],
      };
      entity.contextData.leaders.push(leader);
      while (!scanner.isEOF()) {
        switch (curr.code) {
          case 290:
            leader.hasSetLastLeaderLinePoint = curr.value;
            break;
          case 291:
            leader.hasSetDoglegVector = curr.value;
            break;
          case 10:
            leader.lastLeaderLinePoint = parsePoint(scanner);
            break;
          case 11:
            leader.doglegVector = parsePoint(scanner);
            break;
          case 90:
            leader.leaderBranchIndex = curr.value;
            break;
          case 40:
            leader.doglegLength = curr.value;
            break;
          case 303: // END LEADER
            return;
          case 304: // START LEADER_LINE
            parseLeaderLineData();
            break;
          default:
            break;
        }
        curr = scanner.next();
      }
    }

    function parseLeaderLineData() {
      var leader =
        entity.contextData.leaders[entity.contextData.leaders.length - 1];
      var line = {
        vertices: [[]],
      };
      leader.leaderLines.push(line);
      while (!scanner.isEOF()) {
        switch (curr.code) {
          case 10:
            line.vertices[0].push(parsePoint(scanner));
            break;
          case 305: // END LEADER_LINE
            return;
          default:
            break;
        }
        curr = scanner.next();
      }
    }

    parseCommonData();
    return entity;
  };
  return MLeaderParser;
})();

var EllipseParser = /** @class */ (function () {
  function EllipseParser() {
    this.ForEntityName = "ELLIPSE";
  }

  EllipseParser.prototype.parseEntity = function (scanner, curr) {
    var entity = { type: curr.value };
    curr = scanner.next();
    while (!scanner.isEOF()) {
      if (curr.code === 0) {
        break;
      }
      switch (curr.code) {
        case 10:
          entity.center = parsePoint(scanner);
          break;
        case 11:
          entity.majorAxisEndPoint = parsePoint(scanner);
          break;
        case 40:
          entity.axisRatio = curr.value;
          break;
        case 41:
          entity.startAngle = curr.value;
          break;
        case 42:
          entity.endAngle = curr.value;
          break;
        case 2:
          entity.name = curr.value;
          break;
        default: // check common entity attributes
          checkCommonEntityProperties(entity, curr, scanner);
          break;
      }
      curr = scanner.next();
    }
    return entity;
  };
  return EllipseParser;
})();

function parse3dCreases(scanner, curr) {
  var creases = [];
  const count = curr.value;
  curr = scanner.next();
  for (var i = 0; i < count; i++) {
    if (curr.code != 140) return creases;
    creases.push(curr.value);
    curr = scanner.next();
  }
  scanner.rewind();
  return creases;
}

function parse3dEdges(scanner, curr) {
  var edges = [];
  const count = curr.value;
  curr = scanner.next();
  for (var i = 0; i < count; i++) {
    var edge = [];
    for (var j = 0; j < 2; j++) {
      if (curr.code != 90) return edges;
      curr = scanner.next();
      edge.push(curr.value);
    }
    edges.push(edge);
  }
  scanner.rewind();
  return edges;
}

function parse3dFaces(scanner, curr) {
  var faces = [];
  const count = curr.value;
  curr = scanner.next();
  for (var i = 0; i < count; i++) {
    var face = [];
    var faceCount = curr.value;
    while (faceCount > 0) {
      if (curr.code != 90) return faces;
      curr = scanner.next();
      faceCount--;
      face.push(curr.value);
    }
    faces.push(face);
    curr = scanner.next();
  }
  scanner.rewind();
  return faces;
}

function parse3dVertices(scanner, curr) {
  var vertices = [];
  var vertexIsFinished = false;
  const count = curr.value;
  curr = scanner.next();
  for (var i = 0; i < count; i++) {
    var vertex = {};
    while (!vertexIsFinished) {
      switch (curr.code) {
        case 10: // X
          vertex.x = curr.value;
          break;
        case 20: // Y
          vertex.y = curr.value;
          break;
        case 30: // Z
          vertex.z = curr.value;
          vertexIsFinished = true;
          break;
        default:
          return vertices;
      }
      curr = scanner.next();
    }
    vertices.push(vertex);
    vertexIsFinished = false;
  }
  scanner.rewind();
  return vertices;
}

//https://ezdxf.readthedocs.io/en/stable/dxfinternals/entities/mesh.html#mesh-internals
var MeshParser = /** @class */ (function () {
  function MeshParser() {
    this.ForEntityName = "MESH";
  }

  MeshParser.prototype.parseEntity = function (scanner, curr) {
    var entity = { type: curr.value };
    curr = scanner.next();
    while (!scanner.isEOF()) {
      if (curr.code === 0) {
        break;
      }
      switch (curr.code) {
        case 71:
          entity.version = curr.value;
          break;
        case 72:
          entity.blend_crease = curr.value; //0 = off, 1 = on
          break;
        case 91:
          entity.subdivision_levels = curr.value; //0 for no smoothing else integer greater than 0
          break;
        case 92:
          entity.vertex_count = curr.value;
          entity.vertices = parse3dVertices(scanner, curr, entity.vertex_count);
          curr = scanner.lastReadGroup;
          break;
        case 93:
          entity.face_count = curr.value;
          entity.faces = parse3dFaces(scanner, curr, entity.face_count);
          curr = scanner.lastReadGroup;
          break;
        case 94:
          entity.edge_count = curr.value;
          entity.edges = parse3dEdges(scanner, curr, entity.edge_count);
          curr = scanner.lastReadGroup;
          break;
        case 95:
          entity.crease_count = curr.value;
          entity.creases = parse3dCreases(scanner, curr, entity.crease_count);
          curr = scanner.lastReadGroup;
          break;
        default: // check common entity attributes
          checkCommonEntityProperties(entity, curr, scanner);
          break;
      }
      curr = scanner.next();
    }
    return entity;
  };
  return MeshParser;
})();

var InsertParser = /** @class */ (function () {
  function InsertParser() {
    this.ForEntityName = "INSERT";
  }

  InsertParser.prototype.parseEntity = function (scanner, curr) {
    var entity = { type: curr.value };
    curr = scanner.next();
    while (!scanner.isEOF()) {
      if (curr.code === 0) {
        break;
      }
      switch (curr.code) {
        case 2:
          entity.name = curr.value;
          break;
        case 41:
          entity.xScale = curr.value;
          break;
        case 42:
          entity.yScale = curr.value;
          break;
        case 43:
          entity.zScale = curr.value;
          break;
        case 10:
          entity.position = parsePoint(scanner);
          break;
        case 50:
          entity.rotation = curr.value;
          break;
        case 70:
          entity.columnCount = curr.value;
          break;
        case 71:
          entity.rowCount = curr.value;
          break;
        case 44:
          entity.columnSpacing = curr.value;
          break;
        case 45:
          entity.rowSpacing = curr.value;
          break;
        case 210:
          entity.extrusionDirection = parsePoint(scanner);
          break;
        default: // check common entity attributes
          checkCommonEntityProperties(entity, curr, scanner);
          break;
      }
      curr = scanner.next();
    }
    return entity;
  };
  return InsertParser;
})();

var LineParser = /** @class */ (function () {
  function LineParser() {
    this.ForEntityName = "LINE";
  }

  LineParser.prototype.parseEntity = function (scanner, curr) {
    var entity = {
      type: curr.value,
      vertices: [],
    };
    curr = scanner.next();
    while (!scanner.isEOF()) {
      if (curr.code === 0) {
        break;
      }
      switch (curr.code) {
        case 10: // X coordinate of point
          entity.vertices.unshift(parsePoint(scanner));
          break;
        case 11:
          entity.vertices.push(parsePoint(scanner));
          break;
        case 210:
          entity.extrusionDirection = parsePoint(scanner);
          break;
        case 100:
          break;
        default:
          checkCommonEntityProperties(entity, curr, scanner);
          break;
      }
      curr = scanner.next();
    }
    return entity;
  };
  return LineParser;
})();

var LWPolylineParser = /** @class */ (function () {
  function LWPolylineParser() {
    this.ForEntityName = "LWPolyline";
  }

  LWPolylineParser.prototype.parseEntity = function (scanner, curr) {
    var entity = {
      type: curr.value,
      vertices: [],
    };
    var numberOfVertices = 0;
    curr = scanner.next();
    while (!scanner.isEOF()) {
      if (curr.code === 0) {
        break;
      }
      switch (curr.code) {
        case 38:
          entity.elevation = curr.value;
          break;
        case 39:
          entity.depth = curr.value;
          break;
        case 70: // 1 = Closed shape, 128 = plinegen?, 0 = default
          entity.shape = (curr.value & 1) === 1;
          entity.hasContinuousLinetypePattern = (curr.value & 128) === 128;
          break;
        case 90:
          numberOfVertices = curr.value;
          break;
        case 10: // X coordinate of point
          entity.vertices = parseLWPolylineVertices(numberOfVertices, scanner);
          break;
        case 43:
          if (curr.value !== 0) {
            entity.width = curr.value;
          }
          break;
        case 210:
          entity.extrusionDirectionX = curr.value;
          break;
        case 220:
          entity.extrusionDirectionY = curr.value;
          break;
        case 230:
          entity.extrusionDirectionZ = curr.value;
          break;
        default:
          checkCommonEntityProperties(entity, curr, scanner);
          break;
      }
      curr = scanner.next();
    }
    return entity;
  };
  return LWPolylineParser;
})();

var MTextParser = /** @class */ (function () {
  function MTextParser() {
    this.ForEntityName = "MTEXT";
  }

  MTextParser.prototype.parseEntity = function (scanner, curr) {
    var entity = { type: curr.value };
    curr = scanner.next();
    while (!scanner.isEOF()) {
      if (curr.code === 0) {
        break;
      }
      switch (curr.code) {
        case 3:
          entity.text
            ? (entity.text += curr.value)
            : (entity.text = curr.value);
          break;
        case 1:
          entity.text
            ? (entity.text += curr.value)
            : (entity.text = curr.value);
          break;
        case 10:
          entity.position = parsePoint(scanner);
          break;
        case 11:
          entity.directionVector = parsePoint(scanner);
          break;
        case 40:
          //Note: this is the text height
          entity.height = curr.value;
          break;
        case 41:
          entity.width = curr.value;
          break;
        case 50:
          entity.rotation = curr.value;
          break;
        case 71:
          entity.attachmentPoint = curr.value;
          break;
        case 72:
          entity.drawingDirection = curr.value;
          break;
        default:
          checkCommonEntityProperties(entity, curr, scanner);
          break;
      }
      curr = scanner.next();
    }
    return entity;
  };
  return MTextParser;
})();

var PointParser = /** @class */ (function () {
  function PointParser() {
    this.ForEntityName = "POINT";
  }

  PointParser.prototype.parseEntity = function (scanner, curr) {
    var type = curr.value;
    var entity = { type: type };
    curr = scanner.next();
    while (!scanner.isEOF()) {
      if (curr.code === 0) {
        break;
      }
      switch (curr.code) {
        case 10:
          entity.position = parsePoint(scanner);
          break;
        case 39:
          entity.thickness = curr.value;
          break;
        case 210:
          entity.extrusionDirection = parsePoint(scanner);
          break;
        case 100:
          break;
        default: // check common entity attributes
          checkCommonEntityProperties(entity, curr, scanner);
          break;
      }
      curr = scanner.next();
    }
    return entity;
  };
  return PointParser;
})();

var VertexParser = /** @class */ (function () {
  function VertexParser() {
    this.ForEntityName = "VERTEX";
  }

  VertexParser.prototype.parseEntity = function (scanner, curr) {
    var entity = { type: curr.value };
    curr = scanner.next();
    while (!scanner.isEOF()) {
      if (curr.code === 0) {
        break;
      }
      switch (curr.code) {
        case 10: // X
          entity.x = curr.value;
          break;
        case 20: // Y
          entity.y = curr.value;
          break;
        case 30: // Z
          entity.z = curr.value;
          break;
        case 40: // start width
          break;
        case 41: // end width
          break;
        case 42: // bulge
          if (curr.value != 0) {
            entity.bulge = curr.value;
          }
          break;
        case 70: // flags
          entity.curveFittingVertex = (curr.value & 1) !== 0;
          entity.curveFitTangent = (curr.value & 2) !== 0;
          entity.splineVertex = (curr.value & 8) !== 0;
          entity.splineControlPoint = (curr.value & 16) !== 0;
          entity.threeDPolylineVertex = (curr.value & 32) !== 0;
          entity.threeDPolylineMesh = (curr.value & 64) !== 0;
          entity.polyfaceMeshVertex = (curr.value & 128) !== 0;
          break;
        case 50: // curve fit tangent direction
          break;
        case 71: // polyface mesh vertex index
          entity.faceA = curr.value;
          break;
        case 72: // polyface mesh vertex index
          entity.faceB = curr.value;
          break;
        case 73: // polyface mesh vertex index
          entity.faceC = curr.value;
          break;
        case 74: // polyface mesh vertex index
          entity.faceD = curr.value;
          break;
        default:
          checkCommonEntityProperties(entity, curr, scanner);
          break;
      }
      curr = scanner.next();
    }
    return entity;
  };
  return VertexParser;
})();

var PolylineParser = /** @class */ (function () {
  function PolylineParser() {
    this.ForEntityName = "POLYLINE";
  }

  PolylineParser.prototype.parseEntity = function (scanner, curr) {
    var entity = {
      type: curr.value,
      vertices: [],
    };
    curr = scanner.next();
    while (!scanner.isEOF()) {
      if (curr.code === 0) {
        break;
      }
      switch (curr.code) {
        case 10: // always 0
          break;
        case 20: // always 0
          break;
        case 30: // elevation
          break;
        case 39: // thickness
          entity.thickness = curr.value;
          break;
        case 40: // start width
          break;
        case 41: // end width
          break;
        case 70:
          entity.shape = (curr.value & 1) !== 0;
          entity.includesCurveFitVertices = (curr.value & 2) !== 0;
          entity.includesSplineFitVertices = (curr.value & 4) !== 0;
          entity.is3dPolyline = (curr.value & 8) !== 0;
          entity.is3dPolygonMesh = (curr.value & 16) !== 0;
          entity.is3dPolygonMeshClosed = (curr.value & 32) !== 0; // 32 = The polygon mesh is closed in the N direction
          entity.isPolyfaceMesh = (curr.value & 64) !== 0;
          entity.hasContinuousLinetypePattern = (curr.value & 128) !== 0;
          break;
        case 71: // Polygon mesh M vertex count
          break;
        case 72: // Polygon mesh N vertex count
          break;
        case 73: // Smooth surface M density
          break;
        case 74: // Smooth surface N density
          break;
        case 75: // Curves and smooth surface type
          break;
        case 210:
          entity.extrusionDirection = parsePoint(scanner);
          break;
        default:
          checkCommonEntityProperties(entity, curr, scanner);
          break;
      }
      curr = scanner.next();
    }
    entity.vertices = parsePolylineVertices(scanner, curr);
    return entity;
  };
  return PolylineParser;
})();

var SolidParser = /** @class */ (function () {
  function SolidParser() {
    this.ForEntityName = "SOLID";
  }

  SolidParser.prototype.parseEntity = function (scanner, curr) {
    var entity = {
      type: curr.value,
      points: [],
    };
    curr = scanner.next();
    while (!scanner.isEOF()) {
      if (curr.code === 0) {
        break;
      }
      switch (curr.code) {
        case 10:
          entity.points[0] = parsePoint(scanner);
          break;
        case 11:
          entity.points[1] = parsePoint(scanner);
          break;
        case 12:
          entity.points[2] = parsePoint(scanner);
          break;
        case 13:
          entity.points[3] = parsePoint(scanner);
          break;
        case 210:
          entity.extrusionDirection = parsePoint(scanner);
          break;
        default: // check common entity attributes
          checkCommonEntityProperties(entity, curr, scanner);
          break;
      }
      curr = scanner.next();
    }
    return entity;
  };
  return SolidParser;
})();

var SplineParser = /** @class */ (function () {
  function SplineParser() {
    this.ForEntityName = "SPLINE";
  }

  SplineParser.prototype.parseEntity = function (scanner, curr) {
    var entity = { type: curr.value };
    curr = scanner.next();
    while (!scanner.isEOF()) {
      if (curr.code === 0) {
        break;
      }
      switch (curr.code) {
        case 10:
          if (!entity.controlPoints) {
            entity.controlPoints = [];
          }
          entity.controlPoints.push(parsePoint(scanner));
          break;
        case 11:
          if (!entity.fitPoints) {
            entity.fitPoints = [];
          }
          entity.fitPoints.push(parsePoint(scanner));
          break;
        case 12:
          entity.startTangent = parsePoint(scanner);
          break;
        case 13:
          entity.endTangent = parsePoint(scanner);
          break;
        case 40:
          if (!entity.knotValues) {
            entity.knotValues = [];
          }
          entity.knotValues.push(curr.value);
          break;
        case 70:
          if ((curr.value & 1) != 0) {
            entity.closed = true;
          }
          if ((curr.value & 2) != 0) {
            entity.periodic = true;
          }
          if ((curr.value & 4) != 0) {
            entity.rational = true;
          }
          if ((curr.value & 8) != 0) {
            entity.planar = true;
          }
          if ((curr.value & 16) != 0) {
            entity.planar = true;
            entity.linear = true;
          }
          break;
        case 71:
          entity.degreeOfSplineCurve = curr.value;
          break;
        case 72:
          entity.numberOfKnots = curr.value;
          break;
        case 73:
          entity.numberOfControlPoints = curr.value;
          break;
        case 74:
          entity.numberOfFitPoints = curr.value;
          break;
        case 210:
          entity.normalVector = parsePoint(scanner);
          break;
        default:
          checkCommonEntityProperties(entity, curr, scanner);
          break;
      }
      curr = scanner.next();
    }
    return entity;
  };
  return SplineParser;
})();

var TextParser = /** @class */ (function () {
  function TextParser() {
    this.ForEntityName = "TEXT";
  }

  TextParser.prototype.parseEntity = function (scanner, curr) {
    var entity = { type: curr.value };
    curr = scanner.next();
    while (!scanner.isEOF()) {
      if (curr.code === 0) {
        break;
      }
      switch (curr.code) {
        case 10: // X coordinate of 'first alignment point'
          entity.startPoint = parsePoint(scanner);
          break;
        case 11: // X coordinate of 'second alignment point'
          entity.endPoint = parsePoint(scanner);
          break;
        case 40: // Text height
          entity.textHeight = curr.value;
          break;
        case 41:
          entity.xScale = curr.value;
          break;
        case 50: // Rotation in degrees
          entity.rotation = curr.value;
          break;
        case 1: // Text
          entity.text = curr.value;
          break;
        // NOTE: 72 and 73 are meaningless without 11 (second alignment point)
        case 72: // Horizontal alignment
          entity.halign = curr.value;
          break;
        case 73: // Vertical alignment
          entity.valign = curr.value;
          break;
        default: // check common entity attributes
          checkCommonEntityProperties(entity, curr, scanner);
          break;
      }
      curr = scanner.next();
    }
    return entity;
  };
  return TextParser;
})();

/**
 * DxfArrayScanner
 *
 * Based off the AutoCad 2012 DXF Reference
 * http://images.autodesk.com/adsk/files/autocad_2012_pdf_dxf-reference_enu.pdf
 *
 * Reads through an array representing lines of a dxf file. Takes an array and
 * provides an easy interface to extract group code and value pairs.
 * @param data - an array where each element represents a line in the dxf file
 * @constructor
 */
var DxfArrayScanner = /** @class */ (function () {
  function DxfArrayScanner(data) {
    this._pointer = 0;
    this._eof = false;
    this._data = data;
  }

  /**
   * Gets the next group (code, value) from the array. A group is two consecutive elements
   * in the array. The first is the code, the second is the value.
   * @returns {{code: Number}|*}
   */
  DxfArrayScanner.prototype.next = function () {
    if (!this.hasNext()) {
      if (!this._eof) {
        throw new Error(
          "Unexpected end of input: EOF group not read before end of file. Ended on code " +
            this._data[this._pointer]
        );
      } else {
        throw new Error("Cannot call 'next' after EOF group has been read");
      }
    }
    var group = {
      code: parseInt(this._data[this._pointer]),
    };
    this._pointer++;
    group.value = parseGroupValue(group.code, this._data[this._pointer].trim());
    this._pointer++;
    if (group.code === 0 && group.value === "EOF") {
      this._eof = true;
    }
    this.lastReadGroup = group;
    return group;
  };
  DxfArrayScanner.prototype.peek = function () {
    if (!this.hasNext()) {
      if (!this._eof) {
        throw new Error(
          "Unexpected end of input: EOF group not read before end of file. Ended on code " +
            this._data[this._pointer]
        );
      } else {
        throw new Error("Cannot call 'next' after EOF group has been read");
      }
    }
    var group = {
      code: parseInt(this._data[this._pointer]),
    };
    group.value = parseGroupValue(
      group.code,
      this._data[this._pointer + 1].trim()
    );
    return group;
  };
  DxfArrayScanner.prototype.rewind = function (numberOfGroups) {
    if (numberOfGroups === void 0) {
      numberOfGroups = 1;
    }
    this._pointer = this._pointer - numberOfGroups * 2;
  };
  /**
   * Returns true if there is another code/value pair (2 elements in the array).
   * @returns {boolean}
   */
  DxfArrayScanner.prototype.hasNext = function () {
    // Check if we have read EOF group code
    if (this._eof) {
      return false;
    }
    // We need to be sure there are two lines available
    if (this._pointer > this._data.length - 2) {
      return false;
    }
    return true;
  };
  /**
   * Returns true if the scanner is at the end of the array
   * @returns {boolean}
   */
  DxfArrayScanner.prototype.isEOF = function () {
    return this._eof;
  };
  return DxfArrayScanner;
})();

function groupIs(group, code, value) {
  return group.code === code && group.value === value;
}

/**
 * Returns the truecolor value of the given AutoCad color index value
 * @return {Number} truecolor value as a number
 */
function getAcadColor(index) {
  return AUTO_CAD_COLOR_INDEX[index];
}

/**
 * Parse a boolean according to a 1 or 0 value
 * @param str
 * @returns {boolean}
 */
function parseBoolean(str) {
  if (str === "0") {
    return false;
  }
  if (str === "1") {
    return true;
  }
  throw TypeError("String '" + str + "' cannot be cast to Boolean type");
}

/**
 * Parse a value to its proper type.
 * See pages 3 - 10 of the AutoCad DXF 2012 reference given at the top of this file
 *
 * @param code
 * @param value
 * @returns {*}
 */
function parseGroupValue(code, value) {
  if (code <= 9) {
    return value;
  }
  if (code >= 10 && code <= 59) {
    return parseFloat(value);
  }
  if (code >= 60 && code <= 99) {
    return parseInt(value);
  }
  if (code >= 100 && code <= 109) {
    return value;
  }
  if (code >= 110 && code <= 149) {
    return parseFloat(value);
  }
  if (code >= 160 && code <= 179) {
    return parseInt(value);
  }
  if (code >= 210 && code <= 239) {
    return parseFloat(value);
  }
  if (code >= 270 && code <= 289) {
    return parseInt(value);
  }
  if (code >= 290 && code <= 299) {
    return parseBoolean(value);
  }
  if (code >= 300 && code <= 369) {
    return value;
  }
  if (code >= 370 && code <= 389) {
    return parseInt(value);
  }
  if (code >= 390 && code <= 399) {
    return value;
  }
  if (code >= 400 && code <= 409) {
    return parseInt(value);
  }
  if (code >= 410 && code <= 419) {
    return value;
  }
  if (code >= 420 && code <= 429) {
    return parseInt(value);
  }
  if (code >= 430 && code <= 439) {
    return value;
  }
  if (code >= 440 && code <= 459) {
    return parseInt(value);
  }
  if (code >= 460 && code <= 469) {
    return parseFloat(value);
  }
  if (code >= 470 && code <= 481) {
    return value;
  }
  if (code === 999) {
    return value;
  }
  if (code >= 1000 && code <= 1009) {
    return value;
  }
  if (code >= 1010 && code <= 1059) {
    return parseFloat(value);
  }
  if (code >= 1060 && code <= 1071) {
    return parseInt(value);
  }
  console.log("WARNING: Group code does not have a defined type: %j", {
    code: code,
    value: value,
  });
  return value;
}

/**
 * Parses the 2D or 3D coordinate, vector, or point. When complete,
 * the scanner remains on the last group of the coordinate.
 * @param {*} scanner
 */
function parsePoint(scanner) {
  var point = {};
  // Reread group for the first coordinate
  scanner.rewind();
  var curr = scanner.next();
  var code = curr.code;
  point.x = curr.value;
  code += 10;
  curr = scanner.next();
  if (curr.code != code) {
    throw new Error(
      "Expected code for point value to be " +
        code +
        " but got " +
        curr.code +
        "."
    );
  }
  point.y = curr.value;
  code += 10;
  curr = scanner.next();
  if (curr.code != code) {
    // Only the x and y are specified. Don't read z.
    scanner.rewind(); // Let the calling code advance off the point
    return point;
  }
  point.z = curr.value;
  return point;
}

/**
 * Parses 16 numbers as an array. When complete,
 * the scanner remains on the last group of the value.
 * @param {*} scanner
 * @param {*} groupCode
 */
function parseMatrix(scanner, groupCode) {
  // Reread group for the first coordinate
  scanner.rewind();
  var matrix = [];
  for (var i = 0; i < 16; i++) {
    var curr = scanner.next();
    if (curr.code !== groupCode) {
      throw new Error(
        "Expected code for matrix value to be " +
          groupCode +
          " but got " +
          curr.code +
          "."
      );
    }
    matrix.push(curr.value);
  }
  return matrix;
}

function parse3dFaceVertices(scanner, curr) {
  var vertices = [];
  var vertexIsStarted = false;
  var vertexIsFinished = false;
  var verticesPer3dFace = 4; // there can be up to four vertices per face, although 3 is most used for TIN
  for (var i = 0; i <= verticesPer3dFace; i++) {
    var vertex = {};
    while (!scanner.isEOF()) {
      if (curr.code === 0 || vertexIsFinished) {
        break;
      }
      switch (curr.code) {
        case 10: // X0
        case 11: // X1
        case 12: // X2
        case 13: // X3
          if (vertexIsStarted) {
            vertexIsFinished = true;
            continue;
          }
          vertex.x = curr.value;
          vertexIsStarted = true;
          break;
        case 20: // Y
        case 21:
        case 22:
        case 23:
          vertex.y = curr.value;
          break;
        case 30: // Z
        case 31:
        case 32:
        case 33:
          vertex.z = curr.value;
          break;
        default:
          // it is possible to have entity codes after the vertices.
          // So if code is not accounted for return to entity parser where it might be accounted for
          return vertices;
      }
      curr = scanner.next();
    }
    // See https://groups.google.com/forum/#!topic/comp.cad.autocad/9gn8s5O_w6E
    vertices.push(vertex);
    vertexIsStarted = false;
    vertexIsFinished = false;
  }
  scanner.rewind();
  return vertices;
}

function parseLWPolylineVertices(n, scanner) {
  if (!n || n <= 0) {
    throw Error("n must be greater than 0 verticies");
  }
  var vertices = [];
  var vertexIsStarted = false;
  var vertexIsFinished = false;
  var curr = scanner.lastReadGroup;
  for (var i = 0; i < n; i++) {
    var vertex = {};
    while (!scanner.isEOF()) {
      if (curr.code === 0 || vertexIsFinished) {
        break;
      }
      switch (curr.code) {
        case 10: // X
          if (vertexIsStarted) {
            vertexIsFinished = true;
            continue;
          }
          vertex.x = curr.value;
          vertexIsStarted = true;
          break;
        case 20: // Y
          vertex.y = curr.value;
          break;
        case 30: // Z
          vertex.z = curr.value;
          break;
        case 40: // start width
          vertex.startWidth = curr.value;
          break;
        case 41: // end width
          vertex.endWidth = curr.value;
          break;
        case 42: // bulge
          if (curr.value != 0) {
            vertex.bulge = curr.value;
          }
          break;
        default:
          // if we do not hit known code return vertices.  Code might belong to entity
          scanner.rewind();
          if (vertexIsStarted) {
            vertices.push(vertex);
          }
          scanner.rewind();
          return vertices;
      }
      curr = scanner.next();
    }
    // See https://groups.google.com/forum/#!topic/comp.cad.autocad/9gn8s5O_w6E
    vertices.push(vertex);
    vertexIsStarted = false;
    vertexIsFinished = false;
  }
  scanner.rewind();
  return vertices;
}

function parsePolylineVertices(scanner, curr) {
  var vertex = new VertexParser();
  var vertices = [];
  while (!scanner.isEOF()) {
    if (curr.code === 0) {
      if (curr.value === "VERTEX") {
        vertices.push(vertex.parseEntity(scanner, curr));
        curr = scanner.lastReadGroup;
      } else if (curr.value === "SEQEND") {
        parseSeqEnd(scanner, curr);
        break;
      }
    }
  }
  return vertices;
}

function parseSeqEnd(scanner, curr) {
  var entity = { type: curr.value };
  curr = scanner.next();
  while (!scanner.isEOF()) {
    if (curr.code == 0) {
      break;
    }
    checkCommonEntityProperties(entity, curr, scanner);
    curr = scanner.next();
  }
  return entity;
}

/**
 * Attempts to parse codes common to all entities. Returns true if the group
 * was handled by this function.
 * @param {*} entity - the entity currently being parsed
 * @param {*} curr - the current group being parsed
 * @param {*} scanner - DxfArrayScanner
 */
function checkCommonEntityProperties(entity, curr, scanner) {
  switch (curr.code) {
    case 0:
      entity.type = curr.value;
      break;
    case 5:
      entity.handle = curr.value;
      break;
    case 6:
      entity.lineType = curr.value;
      break;
    case 8: // Layer name
      entity.layer = curr.value;
      break;
    case 48:
      entity.lineTypeScale = curr.value;
      break;
    case 60:
      entity.visible = curr.value === 0;
      break;
    case 62: // Acad Index Color. 0 inherits ByBlock. 256 inherits ByLayer. Default is bylayer
      entity.colorIndex = curr.value;
      entity.color = getAcadColor(Math.abs(curr.value));
      break;
    case 67:
      entity.inPaperSpace = curr.value !== 0;
      break;
    case 100:
      //ignore
      break;
    case 101: // Embedded Object in ACAD 2018.
      // See https://ezdxf.readthedocs.io/en/master/dxfinternals/dxftags.html#embedded-objects
      while (curr.code != 0) {
        curr = scanner.next();
      }
      scanner.rewind();
      break;
    case 330:
      entity.ownerHandle = curr.value;
      break;
    case 347:
      entity.materialObjectHandle = curr.value;
      break;
    case 370:
      //From https://www.woutware.com/Forum/Topic/955/lineweight?returnUrl=%2FForum%2FUserPosts%3FuserId%3D478262319
      // An integer representing 100th of mm, must be one of the following values:
      // 0, 5, 9, 13, 15, 18, 20, 25, 30, 35, 40, 50, 53, 60, 70, 80, 90, 100, 106, 120, 140, 158, 200, 211.
      // -3 = STANDARD, -2 = BYLAYER, -1 = BYBLOCK
      entity.lineweight = curr.value;
      break;
    case 420: // TrueColor Color
      entity.color = curr.value;
      break;
    case 1000:
      entity.extendedData = entity.extendedData || {};
      entity.extendedData.customStrings =
        entity.extendedData.customStrings || [];
      entity.extendedData.customStrings.push(curr.value);
      break;
    case 1001:
      entity.extendedData = entity.extendedData || {};
      entity.extendedData.applicationName = curr.value;
      break;
    default:
      return false;
  }
  return true;
}

function registerDefaultEntityHandlers(dxfParser) {
  // Supported entities here (some entity code is still being refactored into this flow)
  dxfParser.registerEntityHandler(FaceParser);
  dxfParser.registerEntityHandler(ArcParser);
  dxfParser.registerEntityHandler(AttDefParser);
  dxfParser.registerEntityHandler(CircleParser);
  dxfParser.registerEntityHandler(DimensionParser);
  dxfParser.registerEntityHandler(MLeaderParser);
  dxfParser.registerEntityHandler(EllipseParser);
  dxfParser.registerEntityHandler(InsertParser);
  dxfParser.registerEntityHandler(LineParser);
  dxfParser.registerEntityHandler(LWPolylineParser);
  dxfParser.registerEntityHandler(MTextParser);
  dxfParser.registerEntityHandler(PointParser);
  dxfParser.registerEntityHandler(PolylineParser);
  dxfParser.registerEntityHandler(SolidParser);
  dxfParser.registerEntityHandler(SplineParser);
  dxfParser.registerEntityHandler(TextParser);
  dxfParser.registerEntityHandler(MeshParser);
}

function logUnhandledGroup(curr) {
  //console.log('unhandled group ' + debugCode(curr));
}

function debugCode(curr) {
  return curr.code + ":" + curr.value;
}

var DxfParser = /** @class */ (function () {
  function DxfParser() {
    this._entityHandlers = {};
    registerDefaultEntityHandlers(this);
  }

  DxfParser.prototype.parse = function (source) {
    if (typeof source === "string") {
      return this._parse(source);
    } else {
      console.error("Cannot read dxf source of type `" + typeof source);
      return null;
    }
  };
  DxfParser.prototype.registerEntityHandler = function (handlerType) {
    var instance = new handlerType();
    this._entityHandlers[instance.ForEntityName] = instance;
  };
  DxfParser.prototype.parseSync = function (source) {
    return this.parse(source);
  };
  DxfParser.prototype._parse = function (dxfString) {
    var dxf = {};
    var lastHandle = 0;
    var dxfLinesArray = dxfString.split(/\r\n|\r|\n/g);
    var scanner = new DxfArrayScanner(dxfLinesArray);
    if (!scanner.hasNext()) {
      throw Error("Empty file");
    }
    var self = this;
    var curr;

    function parseAll() {
      curr = scanner.next();
      while (!scanner.isEOF()) {
        if (curr.code === 0 && curr.value === "SECTION") {
          curr = scanner.next();
          // Be sure we are reading a section code
          if (curr.code !== 2) {
            console.error(
              "Unexpected code %s after 0:SECTION",
              debugCode(curr)
            );
            curr = scanner.next();
            continue;
          }
          if (curr.value === "HEADER") {
            //console.log('> HEADER');
            dxf.header = parseHeader();
            //console.log('<');
          } else if (curr.value === "BLOCKS") {
            //console.log('> BLOCKS');
            dxf.blocks = parseBlocks();
            //console.log('<');
          } else if (curr.value === "ENTITIES") {
            //console.log('> ENTITIES');
            dxf.entities = parseEntities(false);
            //console.log('<');
          } else if (curr.value === "TABLES") {
            //console.log('> TABLES');
            dxf.tables = parseTables();
            //console.log('<');
          } else if (curr.value === "EOF") {
            //console.log('EOF');
          } else {
            //console.warn('Skipping section \'%s\'', curr.value);
          }
        } else {
          curr = scanner.next();
        }
        // If is a new section
      }
    }

    /**
     *
     * @return {object} header
     */
    function parseHeader() {
      // interesting variables:
      //  $ACADVER, $VIEWDIR, $VIEWSIZE, $VIEWCTR, $TDCREATE, $TDUPDATE
      // http://www.autodesk.com/techpubs/autocad/acadr14/dxf/header_section_al_u05_c.htm
      // Also see VPORT table entries
      var currVarName = null;
      var currVarValue = null;
      var header = {};
      // loop through header variables
      curr = scanner.next();
      while (true) {
        if (groupIs(curr, 0, "ENDSEC")) {
          if (currVarName) {
            header[currVarName] = currVarValue;
          }
          break;
        } else if (curr.code === 9) {
          if (currVarName) {
            header[currVarName] = currVarValue;
          }
          currVarName = curr.value;
          // Filter here for particular variables we are interested in
        } else {
          if (curr.code === 10) {
            currVarValue = { x: curr.value };
          } else if (curr.code === 20) {
            currVarValue.y = curr.value;
          } else if (curr.code === 30) {
            currVarValue.z = curr.value;
          } else {
            currVarValue = curr.value;
          }
        }
        curr = scanner.next();
      }
      // console.log(util.inspect(header, { colors: true, depth: null }));
      curr = scanner.next(); // swallow up ENDSEC
      return header;
    }

    /**
     *
     */
    function parseBlocks() {
      var blocks = {};
      curr = scanner.next();
      while (curr.value !== "EOF") {
        if (groupIs(curr, 0, "ENDSEC")) {
          break;
        }
        if (groupIs(curr, 0, "BLOCK")) {
          //console.log('block {');
          var block = parseBlock();
          //console.log('}');
          ensureHandle(block);
          if (!block.name) {
            console.error(
              'block with handle "' + block.handle + '" is missing a name.'
            );
          } else {
            blocks[block.name] = block;
          }
        } else {
          logUnhandledGroup(curr);
          curr = scanner.next();
        }
      }
      return blocks;
    }

    function parseBlock() {
      var block = {};
      curr = scanner.next();
      while (curr.value !== "EOF") {
        switch (curr.code) {
          case 1:
            block.xrefPath = curr.value;
            curr = scanner.next();
            break;
          case 2:
            block.name = curr.value;
            curr = scanner.next();
            break;
          case 3:
            block.name2 = curr.value;
            curr = scanner.next();
            break;
          case 5:
            block.handle = curr.value;
            curr = scanner.next();
            break;
          case 8:
            block.layer = curr.value;
            curr = scanner.next();
            break;
          case 10:
            block.position = parsePoint(curr);
            curr = scanner.next();
            break;
          case 67:
            block.paperSpace = curr.value && curr.value == 1 ? true : false;
            curr = scanner.next();
            break;
          case 70:
            if (curr.value != 0) {
              //if(curr.value & BLOCK_ANONYMOUS_FLAG) console.log('  Anonymous block');
              //if(curr.value & BLOCK_NON_CONSTANT_FLAG) console.log('  Non-constant attributes');
              //if(curr.value & BLOCK_XREF_FLAG) console.log('  Is xref');
              //if(curr.value & BLOCK_XREF_OVERLAY_FLAG) console.log('  Is xref overlay');
              //if(curr.value & BLOCK_EXTERNALLY_DEPENDENT_FLAG) console.log('  Is externally dependent');
              //if(curr.value & BLOCK_RESOLVED_OR_DEPENDENT_FLAG) console.log('  Is resolved xref or dependent of an xref');
              //if(curr.value & BLOCK_REFERENCED_XREF) console.log('  This definition is a referenced xref');
              block.type = curr.value;
            }
            curr = scanner.next();
            break;
          case 100:
            // ignore class markers
            curr = scanner.next();
            break;
          case 330:
            block.ownerHandle = curr.value;
            curr = scanner.next();
            break;
          case 0:
            if (curr.value == "ENDBLK") {
              break;
            }
            block.entities = parseEntities(true);
            break;
          default:
            logUnhandledGroup(curr);
            curr = scanner.next();
        }
        if (groupIs(curr, 0, "ENDBLK")) {
          curr = scanner.next();
          break;
        }
      }
      return block;
    }

    /**
     * parseTables
     * @return {Object} Object representing tables
     */
    function parseTables() {
      var tables = {};
      curr = scanner.next();
      while (curr.value !== "EOF") {
        if (groupIs(curr, 0, "ENDSEC")) {
          break;
        }
        if (groupIs(curr, 0, "TABLE")) {
          curr = scanner.next();
          var tableDefinition = tableDefinitions[curr.value];
          if (tableDefinition) {
            //console.log(curr.value + ' Table {');
            tables[tableDefinitions[curr.value].tableName] = parseTable(curr);
            //console.log('}');
          } else {
            //console.log('Unhandled Table ' + curr.value);
          }
        } else {
          // else ignored
          curr = scanner.next();
        }
      }
      curr = scanner.next();
      return tables;
    }

    var END_OF_TABLE_VALUE = "ENDTAB";

    function parseTable(group) {
      var tableDefinition = tableDefinitions[group.value];
      var table = {};
      var expectedCount = 0;
      curr = scanner.next();
      while (!groupIs(curr, 0, END_OF_TABLE_VALUE)) {
        switch (curr.code) {
          case 5:
            table.handle = curr.value;
            curr = scanner.next();
            break;
          case 330:
            table.ownerHandle = curr.value;
            curr = scanner.next();
            break;
          case 100:
            if (curr.value === "AcDbSymbolTable") {
              // ignore
              curr = scanner.next();
            } else {
              logUnhandledGroup(curr);
              curr = scanner.next();
            }
            break;
          case 70:
            expectedCount = curr.value;
            curr = scanner.next();
            break;
          case 0:
            if (curr.value === tableDefinition.dxfSymbolName) {
              table[tableDefinition.tableRecordsProperty] =
                tableDefinition.parseTableRecords();
            } else {
              logUnhandledGroup(curr);
              curr = scanner.next();
            }
            break;
          default:
            logUnhandledGroup(curr);
            curr = scanner.next();
        }
      }
      var tableRecords = table[tableDefinition.tableRecordsProperty];
      if (tableRecords) {
        var actualCount = (function () {
          if (tableRecords.constructor === Array) {
            return tableRecords.length;
          } else if (typeof tableRecords === "object") {
            return Object.keys(tableRecords).length;
          }
          return undefined;
        })();
        if (expectedCount !== actualCount) {
          //console.warn('Parsed ' + actualCount + ' ' + tableDefinition.dxfSymbolName + '\'s but expected ' + expectedCount);
        }
      }
      curr = scanner.next();
      return table;
    }

    function parseViewPortRecords() {
      var viewPorts = []; // Multiple table entries may have the same name indicating a multiple viewport configuration
      var viewPort = {};
      //console.log('ViewPort {');
      curr = scanner.next();
      while (!groupIs(curr, 0, END_OF_TABLE_VALUE)) {
        switch (curr.code) {
          case 2: // layer name
            viewPort.name = curr.value;
            curr = scanner.next();
            break;
          case 10:
            viewPort.lowerLeftCorner = parsePoint(curr);
            curr = scanner.next();
            break;
          case 11:
            viewPort.upperRightCorner = parsePoint(curr);
            curr = scanner.next();
            break;
          case 12:
            viewPort.center = parsePoint(curr);
            curr = scanner.next();
            break;
          case 13:
            viewPort.snapBasePoint = parsePoint(curr);
            curr = scanner.next();
            break;
          case 14:
            viewPort.snapSpacing = parsePoint(curr);
            curr = scanner.next();
            break;
          case 15:
            viewPort.gridSpacing = parsePoint(curr);
            curr = scanner.next();
            break;
          case 16:
            viewPort.viewDirectionFromTarget = parsePoint(curr);
            curr = scanner.next();
            break;
          case 17:
            viewPort.viewTarget = parsePoint(curr);
            curr = scanner.next();
            break;
          case 42:
            viewPort.lensLength = curr.value;
            curr = scanner.next();
            break;
          case 43:
            viewPort.frontClippingPlane = curr.value;
            curr = scanner.next();
            break;
          case 44:
            viewPort.backClippingPlane = curr.value;
            curr = scanner.next();
            break;
          case 45:
            viewPort.viewHeight = curr.value;
            curr = scanner.next();
            break;
          case 50:
            viewPort.snapRotationAngle = curr.value;
            curr = scanner.next();
            break;
          case 51:
            viewPort.viewTwistAngle = curr.value;
            curr = scanner.next();
            break;
          case 79:
            viewPort.orthographicType = curr.value;
            curr = scanner.next();
            break;
          case 110:
            viewPort.ucsOrigin = parsePoint(curr);
            curr = scanner.next();
            break;
          case 111:
            viewPort.ucsXAxis = parsePoint(curr);
            curr = scanner.next();
            break;
          case 112:
            viewPort.ucsYAxis = parsePoint(curr);
            curr = scanner.next();
            break;
          case 281:
            viewPort.renderMode = curr.value;
            curr = scanner.next();
            break;
          case 282:
            // 0 is one distant light, 1 is two distant lights
            viewPort.defaultLightingType = curr.value;
            curr = scanner.next();
            break;
          case 292:
            viewPort.defaultLightingOn = curr.value;
            curr = scanner.next();
            break;
          case 330:
            viewPort.ownerHandle = curr.value;
            curr = scanner.next();
            break;
          case 63: // These are all ambient color. Perhaps should be a gradient when multiple are set.
          case 421:
          case 431:
            viewPort.ambientColor = curr.value;
            curr = scanner.next();
            break;
          case 0:
            // New ViewPort
            if (curr.value === "VPORT") {
              console.log("}");
              viewPorts.push(viewPort);
              console.log("ViewPort {");
              viewPort = {};
              curr = scanner.next();
            }
            break;
          default:
            logUnhandledGroup(curr);
            curr = scanner.next();
            break;
        }
      }
      // Note: do not call scanner.next() here,
      //  parseTable() needs the current group
      //console.log('}');
      viewPorts.push(viewPort);
      return viewPorts;
    }

    function parseLineTypes() {
      var ltypes = {};
      var ltype = {};
      var length = 0;
      var ltypeName;
      //console.log('LType {');
      curr = scanner.next();
      while (!groupIs(curr, 0, "ENDTAB")) {
        switch (curr.code) {
          case 2:
            ltype.name = curr.value;
            ltypeName = curr.value;
            curr = scanner.next();
            break;
          case 3:
            ltype.description = curr.value;
            curr = scanner.next();
            break;
          case 73: // Number of elements for this line type (dots, dashes, spaces);
            length = curr.value;
            if (length > 0) {
              ltype.pattern = [];
            }
            curr = scanner.next();
            break;
          case 40: // total pattern length
            ltype.patternLength = curr.value;
            curr = scanner.next();
            break;
          case 49:
            ltype.pattern.push(curr.value);
            curr = scanner.next();
            break;
          case 0:
            //console.log('}');
            if (length > 0 && length !== ltype.pattern.length) {
              console.warn("lengths do not match on LTYPE pattern");
            }
            ltypes[ltypeName] = ltype;
            ltype = {};
            //console.log('LType {');
            curr = scanner.next();
            break;
          default:
            curr = scanner.next();
        }
      }
      //console.log('}');
      ltypes[ltypeName] = ltype;
      return ltypes;
    }

    function parseLayers() {
      var layers = {};
      var layer = {};
      var layerName;
      //console.log('Layer {');
      curr = scanner.next();
      while (!groupIs(curr, 0, "ENDTAB")) {
        switch (curr.code) {
          case 2: // layer name
            layer.name = curr.value;
            layerName = curr.value;
            curr = scanner.next();
            break;
          case 62: // color, visibility
            layer.visible = curr.value >= 0;
            // TODO 0 and 256 are BYBLOCK and BYLAYER respectively. Need to handle these values for layers?.
            layer.colorIndex = Math.abs(curr.value);
            layer.color = getAcadColor(layer.colorIndex);
            curr = scanner.next();
            break;
          case 70: // frozen layer
            layer.frozen = (curr.value & 1) != 0 || (curr.value & 2) != 0;
            curr = scanner.next();
            break;
          case 420: // TrueColor
            layer.color = Math.abs(curr.value);
            curr = scanner.next();
            break;
          case 0:
            // New Layer
            if (curr.value === "LAYER") {
              //console.log('}');
              layers[layerName] = layer;
              //console.log('Layer {');
              layer = {};
              layerName = undefined;
              curr = scanner.next();
            }
            break;
          default:
            logUnhandledGroup(curr);
            curr = scanner.next();
            break;
        }
      }
      // Note: do not call scanner.next() here,
      //  parseLayerTable() needs the current group
      //console.log('}');
      layers[layerName] = layer;
      return layers;
    }

    var tableDefinitions = {
      VPORT: {
        tableRecordsProperty: "viewPorts",
        tableName: "viewPort",
        dxfSymbolName: "VPORT",
        parseTableRecords: parseViewPortRecords,
      },
      LTYPE: {
        tableRecordsProperty: "lineTypes",
        tableName: "lineType",
        dxfSymbolName: "LTYPE",
        parseTableRecords: parseLineTypes,
      },
      LAYER: {
        tableRecordsProperty: "layers",
        tableName: "layer",
        dxfSymbolName: "LAYER",
        parseTableRecords: parseLayers,
      },
    };

    /**
     * Is called after the parser first reads the 0:ENTITIES group. The scanner
     * should be on the start of the first entity already.
     * @return {Array} the resulting entities
     */
    function parseEntities(forBlock) {
      var entities = [];
      var endingOnValue = forBlock ? "ENDBLK" : "ENDSEC";
      if (!forBlock) {
        curr = scanner.next();
      }
      while (true) {
        if (curr.code === 0) {
          if (curr.value === endingOnValue) {
            break;
          }
          var handler = self._entityHandlers[curr.value];
          if (handler != null) {
            //console.log(curr.value + ' {');
            var entity = handler.parseEntity(scanner, curr);
            curr = scanner.lastReadGroup;
            //console.log('}');
            ensureHandle(entity);
            entities.push(entity);
          } else {
            //console.warn('Unhandled entity ' + curr.value);
            curr = scanner.next();
            continue;
          }
        } else {
          // ignored lines from unsupported entity
          curr = scanner.next();
        }
      }
      if (endingOnValue == "ENDSEC") {
        curr = scanner.next();
      } // swallow up ENDSEC, but not ENDBLK
      return entities;
    }

    /**
     * Parses a 2D or 3D point, returning it as an object with x, y, and
     * (sometimes) z property if it is 3D. It is assumed the current group
     * is x of the point being read in, and scanner.next() will return the
     * y. The parser will determine if there is a z point automatically.
     * @return {Object} The 2D or 3D point as an object with x, y[, z]
     */
    function parsePoint(curr) {
      var point = {};
      var code = curr.code;
      point.x = curr.value;
      code += 10;
      curr = scanner.next();
      if (curr.code != code) {
        throw new Error(
          "Expected code for point value to be " +
            code +
            " but got " +
            curr.code +
            "."
        );
      }
      point.y = curr.value;
      code += 10;
      curr = scanner.next();
      if (curr.code != code) {
        scanner.rewind();
        return point;
      }
      point.z = curr.value;
      return point;
    }

    function ensureHandle(entity) {
      if (!entity) {
        throw new TypeError("entity cannot be undefined or null");
      }
      if (!entity.handle) {
        entity.handle = lastHandle++;
      }
    }

    parseAll();
    return dxf;
  };
  return DxfParser;
})();

const textControlCharactersRegex = /\\[AXQWOoLIpfH].*;/g;
const curlyBraces = /\\[{}]/g;

// js extension functions. Webpack doesn't seem to like it if we modify the THREE object directly.
const THREEx = { Math: {} };
/**
 * Returns the angle in radians of the vector (p1,p2). In other words, imagine
 * putting the base of the vector at coordinates (0,0) and finding the angle
 * from vector (1,0) to (p1,p2).
 * @param  {Object} p1 start point of the vector
 * @param  {Object} p2 end point of the vector
 * @return {Number} the angle
 */
THREEx.Math.angle2 = function (p1, p2) {
  var v1 = new Vector2(p1.x, p1.y);
  var v2 = new Vector2(p2.x, p2.y);
  v2.sub(v1); // sets v2 to be our chord
  v2.normalize();
  if (v2.y < 0) {
    return -Math.acos(v2.x);
  }
  return Math.acos(v2.x);
};
THREEx.Math.polar = function (point, distance, angle) {
  var result = {};
  result.x = point.x + distance * Math.cos(angle);
  result.y = point.y + distance * Math.sin(angle);
  return result;
};

function round10(value, exp) {
  // If the exp is undefined or zero...
  if (typeof exp === "undefined" || +exp === 0) {
    return Math.round(value);
  }
  value = +value;
  exp = +exp;
  // If the value is not a number or the exp is not an integer...
  if (isNaN(value) || !(typeof exp === "number" && exp % 1 === 0)) {
    return NaN;
  }
  // Shift
  value = value.toString().split("e");
  value = Math.round(+(value[0] + "e" + (value[1] ? +value[1] - exp : -exp)));
  // Shift back
  value = value.toString().split("e");
  return +(value[0] + "e" + (value[1] ? +value[1] + exp : exp));
}

function decodeDataUri(uri) {
  if (uri) {
    const mime = uri.match(/data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+).*,.*/);
    if (mime && mime.length > 0) {
      const type = mime[1];
      const data = uri.replace("data:" + type + ";", "").split(",");
      if (data && data.length === 2 && data[0] === "base64") {
        const byteString = data[1];
        return Base64.decode(byteString);
      }
    }
  }
  return null;
}

/**
 * Calculates points for a curve between two points using a bulge value. Typically used in polylines.
 * @param startPoint - the starting point of the curve
 * @param endPoint - the ending point of the curve
 * @param bulge - a value indicating how much to curve
 * @param segments - number of segments between the two given points
 */
function getBulgeCurvePoints(startPoint, endPoint, bulge, segments) {
  var vertex, i, center, p0, p1, angle, radius, startAngle, thetaAngle;

  var obj = {};
  obj.startPoint = p0 = startPoint
    ? new Vector2(startPoint.x, startPoint.y)
    : new Vector2(0, 0);
  obj.endPoint = p1 = endPoint
    ? new Vector2(endPoint.x, endPoint.y)
    : new Vector2(1, 0);
  obj.bulge = bulge = bulge || 1;

  angle = 4 * Math.atan(bulge);
  radius = p0.distanceTo(p1) / 2 / Math.sin(angle / 2);
  center = THREEx.Math.polar(
    startPoint,
    radius,
    THREEx.Math.angle2(p0, p1) + (Math.PI / 2 - angle / 2)
  );

  obj.segments = segments =
    segments || Math.max(Math.abs(Math.ceil(angle / (Math.PI / 18))), 6); // By default want a segment roughly every 10 degrees
  startAngle = THREEx.Math.angle2(center, p0);
  thetaAngle = angle / segments;

  var vertices = [];

  vertices.push(new Vector3(p0.x, p0.y, 0));

  for (i = 1; i <= segments - 1; i++) {
    vertex = THREEx.Math.polar(
      center,
      Math.abs(radius),
      startAngle + thetaAngle * i
    );
    vertices.push(new Vector3(vertex.x, vertex.y, 0));
  }

  return vertices;
}

function bSpline(t, degree, points, knots, weights) {
  const n = points.length; // points count
  const d = points[0].length; // point dimensionality

  if (t < 0 || t > 1) {
    throw new Error("t out of bounds [0,1]: " + t);
  }
  if (degree < 1) {
    throw new Error("degree must be at least 1 (linear)");
  }
  if (degree > n - 1) {
    throw new Error("degree must be less than or equal to point count - 1");
  }

  if (!weights) {
    // build weight vector of length [n]
    weights = [];
    for (let i = 0; i < n; i++) {
      weights[i] = 1;
    }
  }

  if (!knots) {
    // build knot vector of length [n + degree + 1]
    knots = [];
    for (let i = 0; i < n + degree + 1; i++) {
      knots[i] = i;
    }
  } else {
    if (knots.length !== n + degree + 1) {
      throw new Error("bad knot vector length");
    }
  }

  const domain = [degree, knots.length - 1 - degree];

  // remap t to the domain where the spline is defined
  const low = knots[domain[0]];
  const high = knots[domain[1]];
  t = t * (high - low) + low;

  // Clamp to the upper &  lower bounds instead of
  // throwing an error like in the original lib
  // https://github.com/bjnortier/dxf/issues/28
  t = Math.max(t, low);
  t = Math.min(t, high);

  // find s (the spline segment) for the [t] value provided
  let s;
  for (s = domain[0]; s < domain[1]; s++) {
    if (t >= knots[s] && t <= knots[s + 1]) {
      break;
    }
  }

  // convert points to homogeneous coordinates
  const v = [];
  for (let i = 0; i < n; i++) {
    v[i] = [];
    for (let j = 0; j < d; j++) {
      v[i][j] = points[i][j] * weights[i];
    }
    v[i][d] = weights[i];
  }

  // l (level) goes from 1 to the curve degree + 1
  let alpha;
  for (let l = 1; l <= degree + 1; l++) {
    // build level l of the pyramid
    for (let i = s; i > s - degree - 1 + l; i--) {
      alpha = (t - knots[i]) / (knots[i + degree + 1 - l] - knots[i]);

      // interpolate each component
      for (let j = 0; j < d + 1; j++) {
        v[i][j] = (1 - alpha) * v[i - 1][j] + alpha * v[i][j];
      }
    }
  }

  // convert back to cartesian and return
  const result = [];
  for (let i = 0; i < d; i++) {
    result[i] = round10(v[s][i] / v[s][d], -9);
  }
  return result;
}

/**
 * Loader implementation for DXF files
 *
 * @param {*} manager LoadingManager
 *
 * @see https://threejs.org/docs/#api/en/loaders/Loader
 * @author Sourabh Soni / https://www.prolincur.com
 */
export class DXFLibLoader extends Loader {
  constructor(manager) {
    super(manager);
    this.font = null;
    this.enableLayer = false;
  }

  setFont(font) {
    this.font = font;
    return this;
  }

  setEnableLayer(enableLayer) {
    this.enableLayer = enableLayer;
    return this;
  }

  load(url, onLoad, onProgress, onError) {
    var scope = this;
    var loader;
    try {
      loader = new XHRLoader(scope.manager);
    } catch {
      loader = new FileLoader(scope.manager);
    }

    loader.setPath(scope.path);
    // Test if it is a data-uri
    const text = decodeDataUri(url);
    if (text) {
      scope.loadString(text, onLoad, onError);
    } else {
      loader.load(
        url,
        (text) => {
          scope.loadString(text, onLoad, onError);
        },
        onProgress,
        onError
      );
    }
  }

  loadString(text, onLoad, onError) {
    var scope = this;
    try {
      onLoad(scope.parse(text));
    } catch (error) {
      if (onError) {
        onError(error);
      } else {
        console.error(error);
      }
      scope.manager.itemError(error);
    }
  }

  parse(text) {
    const parser = new DxfParser();
    var dxf = parser.parseSync(text);
    return this.loadEntities(dxf, this.font, this.enableLayer);
  }

  /**
   * @param {Object} data - the dxf object
   * @param {Object} font - a font loaded with FontLoader
   * @constructor
   */
  loadEntities(data, font, enableLayer) {
    createLineTypeShaders(data);

    var entities = [];
    var layers = {};

    // Create scene from dxf object (data)
    var i, entity, obj;

    for (i = 0; i < data.entities.length; i++) {
      entity = data.entities[i];
      obj = drawEntity(entity, data);

      if (obj) {
        entities.push(obj);
        if (enableLayer && entity.layer) {
          let layerGroup = layers[entity.layer];
          if (!layerGroup) {
            layerGroup = new Group();
            layerGroup.name = entity.layer;
            layers[entity.layer] = layerGroup;
          }
          layerGroup.add(obj);
        }
      }
      obj = null;
    }
    return {
      entities: enableLayer ? Object.values(layers) : entities,
      dxf: data,
    };

    /* Entity Type
          'POINT' | '3DFACE' | 'ARC' | 'ATTDEF' | 'CIRCLE' | 'DIMENSION' | 'MULTILEADER' | 'ELLIPSE' | 'INSERT' | 'LINE' |
          'LWPOLYLINE' | 'MTEXT' | 'POLYLINE' | 'SOLID' | 'SPLINE' | 'TEXT' | 'VERTEX'
      */
    function drawEntity(entity, data) {
      var mesh;
      if (entity.type === "CIRCLE" || entity.type === "ARC") {
        mesh = drawArc(entity, data);
      } else if (
        entity.type === "LWPOLYLINE" ||
        entity.type === "LINE" ||
        entity.type === "POLYLINE"
      ) {
        mesh = drawLine(entity, data);
      } else if (entity.type === "TEXT") {
        mesh = drawText(entity, data);
      } else if (entity.type === "SOLID") {
        mesh = drawSolid(entity, data);
      } else if (entity.type === "POINT") {
        mesh = drawPoint(entity, data);
      } else if (entity.type === "INSERT") {
        mesh = drawBlock(entity, data);
      } else if (entity.type === "SPLINE") {
        mesh = drawSpline(entity, data);
      } else if (entity.type === "MTEXT") {
        mesh = drawMtext(entity, data);
      } else if (entity.type === "ELLIPSE") {
        mesh = drawEllipse(entity, data);
      } else if (entity.type === "DIMENSION") {
        var dimTypeEnum = entity.dimensionType & 7;
        if (dimTypeEnum === 0) {
          mesh = drawDimension(entity, data);
        } else {
          //console.log("Unsupported Dimension type: " + dimTypeEnum);
        }
      } else {
        //console.log("Unsupported Entity Type: " + entity.type);
      }
      return mesh;
    }

    function drawEllipse(entity, data) {
      var color = getColor(entity, data);

      var xrad = Math.sqrt(
        Math.pow(entity.majorAxisEndPoint.x, 2) +
          Math.pow(entity.majorAxisEndPoint.y, 2)
      );
      var yrad = xrad * entity.axisRatio;
      var rotation = Math.atan2(
        entity.majorAxisEndPoint.y,
        entity.majorAxisEndPoint.x
      );

      var curve = new EllipseCurve(
        entity.center.x,
        entity.center.y,
        xrad,
        yrad,
        entity.startAngle,
        entity.endAngle,
        false, // Always counterclockwise
        rotation
      );

      var points = curve.getPoints(50);
      var geometry = new BufferGeometry().setFromPoints(points);
      var material = new LineBasicMaterial({
        linewidth: 1,
        color: color,
      });

      // Create the final object to add to the scene
      var ellipse = new Line(geometry, material);
      return ellipse;
    }

    function drawMtext(entity, data) {
      var color = getColor(entity, data);

      if (!font) {
        return console.log("font parameter not set. Ignoring text entity.");
      }

      var textAndControlChars = parseDxfMTextContent(entity.text);

      //Note: We currently only support a single format applied to all the mtext text
      var content = mtextContentAndFormattingToTextAndStyle(
        textAndControlChars,
        entity,
        color
      );

      var txt = createTextForScene(content.text, content.style, entity, color);
      if (!txt) {
        return null;
      }

      var group = new Object3D();
      group.add(txt);
      return group;
    }

    function mtextContentAndFormattingToTextAndStyle(
      textAndControlChars,
      entity,
      color
    ) {
      let activeStyle = {
        horizontalAlignment: "left",
        textHeight: entity.height,
      };

      var text = [];
      for (let item of textAndControlChars) {
        if (typeof item === "string") {
          if (item.startsWith("pxq") && item.endsWith(";")) {
            if (item.indexOf("c") !== -1) {
              activeStyle.horizontalAlignment = "center";
            } else if (item.indexOf("l") !== -1) {
              activeStyle.horizontalAlignment = "left";
            } else if (item.indexOf("r") !== -1) {
              activeStyle.horizontalAlignment = "right";
            } else if (item.indexOf("j") !== -1) {
              activeStyle.horizontalAlignment = "justify";
            }
          } else {
            text.push(item);
          }
        } else if (Array.isArray(item)) {
          var nestedFormat = mtextContentAndFormattingToTextAndStyle(
            item,
            entity,
            color
          );
          text.push(nestedFormat.text);
        } else if (typeof item === "object") {
          if (item["S"] && item["S"].length === 3) {
            text.push(item["S"][0] + "/" + item["S"][2]);
          } else {
            // not yet supported.
          }
        }
      }
      return {
        text: text.join(),
        style: activeStyle,
      };
    }

    function createTextForScene(text, style, entity, color) {
      if (!text) {
        return null;
      }

      let textEnt = new Text();
      textEnt.text = text.replaceAll("\\P", "\n").replaceAll("\\X", "\n");

      textEnt.font = font;
      textEnt.fontSize = style.textHeight;
      textEnt.maxWidth = entity.width;
      textEnt.position.x = entity.position.x;
      textEnt.position.y = entity.position.y;
      textEnt.position.z = entity.position.z;
      textEnt.textAlign = style.horizontalAlignment;
      textEnt.color = color;
      if (entity.rotation) {
        textEnt.rotation.z = (entity.rotation * Math.PI) / 180;
      }
      if (entity.directionVector) {
        var dv = entity.directionVector;
        textEnt.rotation.z = new Vector3(1, 0, 0).angleTo(
          new Vector3(dv.x, dv.y, dv.z)
        );
      }
      switch (entity.attachmentPoint) {
        case 1:
          // Top Left
          textEnt.anchorX = "left";
          textEnt.anchorY = "top";
          break;
        case 2:
          // Top Center
          textEnt.anchorX = "center";
          textEnt.anchorY = "top";
          break;
        case 3:
          // Top Right
          textEnt.anchorX = "right";
          textEnt.anchorY = "top";
          break;

        case 4:
          // Middle Left
          textEnt.anchorX = "left";
          textEnt.anchorY = "middle";
          break;
        case 5:
          // Middle Center
          textEnt.anchorX = "center";
          textEnt.anchorY = "middle";
          break;
        case 6:
          // Middle Right
          textEnt.anchorX = "right";
          textEnt.anchorY = "middle";
          break;

        case 7:
          // Bottom Left
          textEnt.anchorX = "left";
          textEnt.anchorY = "bottom";
          break;
        case 8:
          // Bottom Center
          textEnt.anchorX = "center";
          textEnt.anchorY = "bottom";
          break;
        case 9:
          // Bottom Right
          textEnt.anchorX = "right";
          textEnt.anchorY = "bottom";
          break;

        default:
          return undefined;
      }
      textEnt.sync(() => {
        if (textEnt.textAlign !== "left") {
          textEnt.geometry.computeBoundingBox();
          var textWidth =
            textEnt.geometry.boundingBox.max.x -
            textEnt.geometry.boundingBox.min.x;
          if (textEnt.textAlign === "center") {
            textEnt.position.x += (entity.width - textWidth) / 2;
          }
          if (textEnt.textAlign === "right") {
            textEnt.position.x += entity.width - textWidth;
          }
        }
      });

      return textEnt;
    }

    function drawSpline(entity, data) {
      var color = getColor(entity, data);

      var points = getBSplinePolyline(
        entity.controlPoints,
        entity.degreeOfSplineCurve,
        entity.knotValues,
        100
      );

      var geometry = new BufferGeometry().setFromPoints(points);
      var material = new LineBasicMaterial({
        linewidth: 1,
        color: color,
      });
      var splineObject = new Line(geometry, material);

      return splineObject;
    }

    /**
     * Interpolate a b-spline. The algorithm examins the knot vector
     * to create segments for interpolation. The parameterisation value
     * is re-normalised back to [0,1] as that is what the lib expects (
     * and t i de-normalised in the b-spline library)
     *
     * @param controlPoints the control points
     * @param degree the b-spline degree
     * @param knots the knot vector
     * @returns the polyline
     */
    function getBSplinePolyline(
      controlPoints,
      degree,
      knots,
      interpolationsPerSplineSegment,
      weights
    ) {
      const polyline = [];
      const controlPointsForLib = controlPoints.map(function (p) {
        return [p.x, p.y];
      });

      const segmentTs = [knots[degree]];
      const domain = [knots[degree], knots[knots.length - 1 - degree]];

      for (let k = degree + 1; k < knots.length - degree; ++k) {
        if (segmentTs[segmentTs.length - 1] !== knots[k]) {
          segmentTs.push(knots[k]);
        }
      }

      interpolationsPerSplineSegment = interpolationsPerSplineSegment || 25;
      for (let i = 1; i < segmentTs.length; ++i) {
        const uMin = segmentTs[i - 1];
        const uMax = segmentTs[i];
        for (let k = 0; k <= interpolationsPerSplineSegment; ++k) {
          const u = (k / interpolationsPerSplineSegment) * (uMax - uMin) + uMin;
          // Clamp t to 0, 1 to handle numerical precision issues
          let t = (u - domain[0]) / (domain[1] - domain[0]);
          t = Math.max(t, 0);
          t = Math.min(t, 1);
          const p = bSpline(t, degree, controlPointsForLib, knots, weights);
          polyline.push(new Vector2(p[0], p[1]));
        }
      }
      return polyline;
    }

    function drawLine(entity, data) {
      let points = [];
      let color = getColor(entity, data);
      var material,
        lineType,
        vertex,
        startPoint,
        endPoint,
        bulgeGeometry,
        bulge,
        i,
        line;

      if (!entity.vertices) {
        return console.log("entity missing vertices.");
      }

      // create geometry
      for (i = 0; i < entity.vertices.length; i++) {
        if (entity.vertices[i].bulge) {
          bulge = entity.vertices[i].bulge;
          startPoint = entity.vertices[i];
          endPoint =
            i + 1 < entity.vertices.length ? entity.vertices[i + 1] : points[0];

          let bulgePoints = getBulgeCurvePoints(startPoint, endPoint, bulge);

          points.push.apply(points, bulgePoints);
        } else {
          vertex = entity.vertices[i];
          points.push(new Vector3(vertex.x, vertex.y, 0));
        }
      }
      if (entity.shape) {
        points.push(points[0]);
      }

      // set material
      if (entity.lineType) {
        lineType = data.tables.lineType.lineTypes[entity.lineType];
      }

      if (lineType && lineType.pattern && lineType.pattern.length !== 0) {
        material = new LineDashedMaterial({
          color: color,
          gapSize: 4,
          dashSize: 4,
        });
      } else {
        material = new LineBasicMaterial({
          linewidth: 1,
          color: color,
        });
      }

      var geometry = new BufferGeometry().setFromPoints(points);

      line = new Line(geometry, material);
      return line;
    }

    function drawArc(entity, data) {
      var startAngle, endAngle;
      if (entity.type === "CIRCLE") {
        startAngle = entity.startAngle || 0;
        endAngle = startAngle + 2 * Math.PI;
      } else {
        startAngle = entity.startAngle;
        endAngle = entity.endAngle;
      }

      var curve = new ArcCurve(0, 0, entity.radius, startAngle, endAngle);

      var points = curve.getPoints(32);
      var geometry = new BufferGeometry().setFromPoints(points);

      var material = new LineBasicMaterial({ color: getColor(entity, data) });

      var arc = new Line(geometry, material);
      arc.position.x = entity.center.x;
      arc.position.y = entity.center.y;
      arc.position.z = entity.center.z;

      return arc;
    }

    function addTriangleFacingCamera(verts, p0, p1, p2) {
      // Calculate which direction the points are facing (clockwise or counter-clockwise)
      var vector1 = new Vector3();
      var vector2 = new Vector3();
      vector1.subVectors(p1, p0);
      vector2.subVectors(p2, p0);
      vector1.cross(vector2);

      var v0 = new Vector3(p0.x, p0.y, p0.z);
      var v1 = new Vector3(p1.x, p1.y, p1.z);
      var v2 = new Vector3(p2.x, p2.y, p2.z);

      // If z < 0 then we must draw these in reverse order
      if (vector1.z < 0) {
        verts.push(v2, v1, v0);
      } else {
        verts.push(v0, v1, v2);
      }
    }

    function drawSolid(entity, data) {
      var material,
        verts,
        geometry = new BufferGeometry();

      var points = entity.points;
      // verts = geometry.vertices;
      verts = [];
      addTriangleFacingCamera(verts, points[0], points[1], points[2]);
      addTriangleFacingCamera(verts, points[1], points[2], points[3]);

      material = new MeshBasicMaterial({ color: getColor(entity, data) });
      geometry.setFromPoints(verts);

      return new Mesh(geometry, material);
    }

    function drawText(entity, data) {
      var geometry, material, text;

      if (!font) {
        return console.warn(
          "Text is not supported without a js font loaded with FontLoader! Load a font of your choice and pass this into the constructor. See the sample for this repository or js examples at http://threejs.org/examples/?q=text#webgl_geometry_text for more details."
        );
      }

      geometry = new TextGeometry(entity.text, {
        font: font,
        height: 0,
        size: entity.textHeight || 12,
      });

      if (entity.rotation) {
        var zRotation = (entity.rotation * Math.PI) / 180;
        geometry.rotateZ(zRotation);
      }

      material = new MeshBasicMaterial({ color: getColor(entity, data) });

      text = new Mesh(geometry, material);
      text.position.x = entity.startPoint.x;
      text.position.y = entity.startPoint.y;
      text.position.z = entity.startPoint.z;

      return text;
    }

    function drawPoint(entity, data) {
      var geometry, material, point;

      geometry = new BufferGeometry();

      geometry.setAttribute(
        "position",
        new Float32BufferAttribute(
          [entity.position.x, entity.position.y, entity.position.z],
          3
        )
      );

      var color = getColor(entity, data);

      material = new PointsMaterial({
        size: 0.1,
        color: new Color(color),
      });
      point = new Points(geometry, material);
      return point;
    }

    function drawDimension(entity, data) {
      var block = data.blocks[entity.block];

      if (!block || !block.entities) {
        return null;
      }

      var group = new Object3D();
      // if(entity.anchorPoint) {
      //     group.position.x = entity.anchorPoint.x;
      //     group.position.y = entity.anchorPoint.y;
      //     group.position.z = entity.anchorPoint.z;
      // }

      for (var i = 0; i < block.entities.length; i++) {
        var childEntity = drawEntity(block.entities[i], data, group);
        if (childEntity) {
          group.add(childEntity);
        }
      }

      return group;
    }

    function drawBlock(entity, data) {
      var block = data.blocks[entity.name];

      if (!block.entities) {
        return null;
      }

      var group = new Object3D();

      if (entity.xScale) {
        group.scale.x = entity.xScale;
      }
      if (entity.yScale) {
        group.scale.y = entity.yScale;
      }

      if (entity.rotation) {
        group.rotation.z = (entity.rotation * Math.PI) / 180;
      }

      if (entity.position) {
        group.position.x = entity.position.x;
        group.position.y = entity.position.y;
        group.position.z = entity.position.z;
      }

      for (var i = 0; i < block.entities.length; i++) {
        var childEntity = drawEntity(block.entities[i], data, group);
        if (childEntity) {
          group.add(childEntity);
        }
      }

      return group;
    }

    function getColor(entity, data) {
      var color = 0x000000; //default
      if (entity.color) {
        color = entity.color;
      } else if (
        data.tables &&
        data.tables.layer &&
        data.tables.layer.layers[entity.layer]
      ) {
        color = data.tables.layer.layers[entity.layer].color;
      }

      if (color == null || color === 0xffffff) {
        color = 0x000000;
      }
      return color;
    }

    function createLineTypeShaders(data) {
      var ltype, type;
      if (!data.tables || !data.tables.lineType) {
        return;
      }
      var ltypes = data.tables.lineType.lineTypes;

      for (type in ltypes) {
        ltype = ltypes[type];
        if (!ltype.pattern) {
          continue;
        }
        ltype.material = createDashedLineShader(ltype.pattern);
      }
    }

    function createDashedLineShader(pattern) {
      var i,
        dashedLineShader = {},
        totalLength = 0.0;

      for (i = 0; i < pattern.length; i++) {
        totalLength += Math.abs(pattern[i]);
      }

      dashedLineShader.uniforms = UniformsUtils.merge([
        UniformsLib["common"],
        UniformsLib["fog"],

        {
          pattern: {
            type: "fv1",
            value: pattern,
          },
          patternLength: {
            type: "f",
            value: totalLength,
          },
        },
      ]);

      dashedLineShader.vertexShader = [
        "attribute float lineDistance;",

        "varying float vLineDistance;",

        ShaderChunk["color_pars_vertex"],

        "void main() {",

        ShaderChunk["color_vertex"],

        "vLineDistance = lineDistance;",

        "gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );",

        "}",
      ].join("\n");

      dashedLineShader.fragmentShader = [
        "uniform vec3 diffuse;",
        "uniform float opacity;",

        "uniform float pattern[" + pattern.length + "];",
        "uniform float patternLength;",

        "varying float vLineDistance;",

        ShaderChunk["color_pars_fragment"],
        ShaderChunk["fog_pars_fragment"],

        "void main() {",

        "float pos = mod(vLineDistance, patternLength);",

        "for ( int i = 0; i < " + pattern.length + "; i++ ) {",
        "pos = pos - abs(pattern[i]);",
        "if( pos < 0.0 ) {",
        "if( pattern[i] > 0.0 ) {",
        "gl_FragColor = vec4(1.0, 0.0, 0.0, opacity );",
        "break;",
        "}",
        "discard;",
        "}",

        "}",

        ShaderChunk["color_fragment"],
        ShaderChunk["fog_fragment"],

        "}",
      ].join("\n");

      return dashedLineShader;
    }
  }
}
