export const conditionPresets = [
  {
    id: "mumbai-heavy",
    name: "Mumbai monsoon",
    summary: "Dense coastal cloud cover with high humidity",
    values: {
      location: "Mumbai, Maharashtra",
      date: "2005-06-23",
      cloudType: "Deep convective cloud mass",
      temperature: 27,
      humidity: 91,
      pressure: 996,
      windSpeed: 12,
      cloudCover: 88,
      rainfall: 142,
    },
  },
  {
    id: "kerala-extreme",
    name: "Kerala flood band",
    summary: "Very moist air, low pressure, broad cloud shield",
    values: {
      location: "Kerala coast",
      date: "2018-08-15",
      cloudType: "Organized rain band",
      temperature: 25,
      humidity: 94,
      pressure: 992,
      windSpeed: 15,
      cloudCover: 93,
      rainfall: 196,
    },
  },
  {
    id: "moderate-system",
    name: "Moderate system",
    summary: "Patchy clouds with moderate rainfall indicators",
    values: {
      location: "Coastal Karnataka",
      date: "2019-08-04",
      cloudType: "Broken cumulonimbus",
      temperature: 29,
      humidity: 76,
      pressure: 1004,
      windSpeed: 7,
      cloudCover: 61,
      rainfall: 48,
    },
  },
];

export const sampleScenes = [
  {
    id: "mumbai-2005-scene",
    name: "Mumbai 2005",
    summary: "Dense monsoon cloud field",
    inputImage: "/sample-scenes/mumbai-2005-input.jpg",
    gradcamImage: "/sample-scenes/mumbai-2005-gradcam.jpg",
    values: conditionPresets[0].values,
  },
  {
    id: "kerala-2018-scene",
    name: "Kerala 2018",
    summary: "Broad flood-producing cloud band",
    inputImage: "/sample-scenes/kerala-2018-input.jpg",
    gradcamImage: "/sample-scenes/kerala-2018-gradcam.jpg",
    values: conditionPresets[1].values,
  },
  {
    id: "mumbai-2019-scene",
    name: "Mumbai 2019",
    summary: "Coastal convective cells",
    inputImage: "/sample-scenes/mumbai-2019-input.jpg",
    gradcamImage: "/sample-scenes/mumbai-2019-gradcam.jpg",
    values: {
      location: "Mumbai, Maharashtra",
      date: "2019-08-04",
      cloudType: "Coastal convective cells",
      temperature: 28,
      humidity: 82,
      pressure: 1001,
      windSpeed: 9,
      cloudCover: 72,
      rainfall: 86,
    },
  },
];

export const emptyWeatherForm = {
  location: "",
  date: "",
  cloudType: "",
  temperature: "",
  humidity: "",
  pressure: "",
  windSpeed: "",
  cloudCover: "",
  rainfall: "",
};

const similarCaseBank = [
  {
    location: "Mumbai",
    date: "2005-06-23",
    humidity: 91,
    pressure: 996,
    cloudCover: 88,
    rainfall: 142,
    conditions: "High humidity, dense cloud clusters, falling pressure",
    outcome: "Heavy rainfall and urban flooding risk increased.",
    risk: "substantial",
  },
  {
    location: "Kerala",
    date: "2018-08-15",
    humidity: 94,
    pressure: 992,
    cloudCover: 93,
    rainfall: 196,
    conditions: "Very high cloud cover, saturated air, strong moisture inflow",
    outcome: "Extreme rainfall persisted across multiple districts.",
    risk: "extreme",
  },
  {
    location: "Mumbai",
    date: "2017-07-17",
    humidity: 84,
    pressure: 1000,
    cloudCover: 76,
    rainfall: 91,
    conditions: "Coastal convection with moderate wind support",
    outcome: "Localized heavy rain cells formed near the coast.",
    risk: "substantial",
  },
  {
    location: "Chennai",
    date: "2015-12-01",
    humidity: 89,
    pressure: 998,
    cloudCover: 86,
    rainfall: 174,
    conditions: "Slow-moving coastal system with saturated low-level air",
    outcome: "Sustained heavy rainfall caused drainage stress across the city.",
    risk: "substantial",
  },
  {
    location: "Konkan coast",
    date: "2021-07-22",
    humidity: 92,
    pressure: 994,
    cloudCover: 91,
    rainfall: 210,
    conditions: "Deep monsoon cloud band aligned with strong moisture transport",
    outcome: "Extreme rainfall pockets developed along the windward slopes.",
    risk: "extreme",
  },
  {
    location: "Guwahati",
    date: "2022-06-15",
    humidity: 87,
    pressure: 1002,
    cloudCover: 79,
    rainfall: 118,
    conditions: "Moist convective clusters with persistent cloud-top cooling",
    outcome: "High runoff risk was observed in low-lying urban areas.",
    risk: "substantial",
  },
  {
    location: "Hyderabad",
    date: "2020-10-13",
    humidity: 81,
    pressure: 1001,
    cloudCover: 74,
    rainfall: 128,
    conditions: "Organized rain cells formed over a warm, humid boundary layer",
    outcome: "Short-duration intense rainfall led to urban flooding reports.",
    risk: "substantial",
  },
  {
    location: "Coastal Karnataka",
    date: "2019-08-04",
    humidity: 76,
    pressure: 1004,
    cloudCover: 61,
    rainfall: 48,
    conditions: "Patchy cumulonimbus clouds with moderate surface moisture",
    outcome: "Scattered heavy showers occurred without widespread flooding.",
    risk: "moderate",
  },
  {
    location: "Vidarbha",
    date: "2023-07-19",
    humidity: 70,
    pressure: 1007,
    cloudCover: 57,
    rainfall: 36,
    conditions: "Broken cloud shield and weaker pressure anomaly",
    outcome: "Moderate rainfall occurred with limited impact concentration.",
    risk: "moderate",
  },
  {
    location: "Ahmedabad",
    date: "2022-08-06",
    humidity: 64,
    pressure: 1009,
    cloudCover: 42,
    rainfall: 18,
    conditions: "Shallow cloud patches with limited moisture depth",
    outcome: "Low rainfall impact was recorded across most observation points.",
    risk: "low",
  },
];

function numberValue(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function historySimilarity(caseItem, weather, riskLevel) {
  const humidity = numberValue(weather.humidity);
  const pressure = numberValue(weather.pressure);
  const cloudCover = numberValue(weather.cloudCover);
  const rainfall = numberValue(weather.rainfall);
  const location = String(weather.location || "").toLowerCase();

  const weatherScore =
    (100 - Math.min(100, Math.abs(caseItem.humidity - humidity))) * 0.22 +
    (100 - Math.min(100, Math.abs(caseItem.cloudCover - cloudCover))) * 0.28 +
    (100 - Math.min(100, Math.abs(caseItem.rainfall - rainfall) / 2)) * 0.24 +
    (100 - Math.min(100, Math.abs(caseItem.pressure - pressure) * 3)) * 0.16;
  const riskScore = caseItem.risk === riskLevel ? 18 : 0;
  const locationScore = location && location.includes(caseItem.location.toLowerCase())
    ? 12
    : 0;

  return Math.max(0, Math.round(weatherScore + riskScore + locationScore));
}

function selectHistoricalCases(weather, riskLevel) {
  return similarCaseBank
    .map((item) => ({
      ...item,
      match: historySimilarity(item, weather, riskLevel),
      jitter: Math.random() * 6,
    }))
    .sort((a, b) => b.match + b.jitter - (a.match + a.jitter))
    .slice(0, 5)
    .map(({ jitter, ...item }) => item);
}

export function analyzeCloudConditions(weather) {
  const humidity = numberValue(weather.humidity);
  const pressure = numberValue(weather.pressure);
  const cloudCover = numberValue(weather.cloudCover);
  const rainfall = numberValue(weather.rainfall);
  const windSpeed = numberValue(weather.windSpeed);

  const humiditySignal = humidity / 100;
  const cloudSignal = cloudCover / 100;
  const pressureSignal = Math.max(0, Math.min(1, (1012 - pressure) / 28));
  const rainfallSignal = Math.max(0, Math.min(1, rainfall / 220));
  const windSignal = Math.max(0, Math.min(1, windSpeed / 22));

  const score =
    humiditySignal * 0.24 +
    cloudSignal * 0.28 +
    pressureSignal * 0.2 +
    rainfallSignal * 0.2 +
    windSignal * 0.08;

  const probability = Math.max(0.08, Math.min(0.97, score));
  const riskLevel =
    probability >= 0.78
      ? "extreme"
      : probability >= 0.58
        ? "substantial"
        : probability >= 0.38
          ? "moderate"
          : "low";

  const drivers = [
    { label: "Cloud cover", value: `${cloudCover || 0}%`, impact: cloudSignal },
    { label: "Humidity", value: `${humidity || 0}%`, impact: humiditySignal },
    {
      label: "Pressure drop",
      value: pressure ? `${pressure} hPa` : "not set",
      impact: pressureSignal,
    },
    { label: "Rainfall signal", value: `${rainfall || 0} mm`, impact: rainfallSignal },
  ].sort((a, b) => b.impact - a.impact);

  const explanation =
    riskLevel === "low"
      ? "The current inputs show limited cloud organization and weak rainfall indicators."
      : `The strongest signals are ${drivers[0].label.toLowerCase()} and ${drivers[1].label.toLowerCase()}. Those inputs increase attention over compact cloud clusters and broader organized cloud bands in the Grad-CAM view.`;

  return {
    probability,
    riskLevel,
    confidence: Math.min(0.92, 0.62 + probability * 0.28),
    drivers,
    explanation,
    similarCases: selectHistoricalCases(weather, riskLevel),
  };
}
