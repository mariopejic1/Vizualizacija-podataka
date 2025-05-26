const width = 960;
const height = 600;
const svg = d3.select("#map");
const tooltip = d3.select("#tooltip");

const cityCoordinates = {
  "Athens": [23.7275, 37.9838],          // 1896 Summer
  "Paris": [2.3522, 48.8566],            // 1900 Summer, 1924 Summer
  "St. Louis": [-90.1994, 38.6270],      // 1904 Summer
  "London": [-0.1278, 51.5074],          // 1908 Summer, 1948 Summer, 2012 Summer
  "Stockholm": [18.0686, 59.3293],       // 1912 Summer
  "Antwerp": [4.4028, 51.2194],          // 1920 Summer
  "Paris": [2.3522, 48.8566],             // ponovljeno
  "Amsterdam": [4.9041, 52.3676],         // 1928 Summer
  "Los Angeles": [-118.2437, 34.0522],   // 1932 Summer, 1984 Summer
  "Berlin": [13.4050, 52.5200],           // 1936 Summer
  "London": [-0.1278, 51.5074],           // ponovljeno
  "Helsinki": [24.9355, 60.1695],         // 1952 Summer
  "Melbourne": [144.9631, -37.8136],      // 1956 Summer
  "Rome": [12.4964, 41.9028],             // 1960 Summer
  "Tokyo": [139.6917, 35.6895],           // 1964 Summer, 2020 Summer
  "Mexico City": [-99.1332, 19.4326],     // 1968 Summer
  "Munich": [11.5820, 48.1351],           // 1972 Summer
  "Montreal": [-73.5673, 45.5017],        // 1976 Summer
  "Moscow": [37.6173, 55.7558],           // 1980 Summer
  "Seoul": [126.9780, 37.5665],           // 1988 Summer
  "Barcelona": [2.1734, 41.3851],         // 1992 Summer
  "Atlanta": [-84.3880, 33.7490],         // 1996 Summer
  "Sydney": [151.2093, -33.8688],         // 2000 Summer
  "Athens": [23.7275, 37.9838],           // 2004 Summer
  "Beijing": [116.4074, 39.9042],         // 2008 Summer
  "London": [-0.1278, 51.5074],           // ponovljeno
  "Rio de Janeiro": [-43.1729, -22.9068], // 2016 Summer
};

// Load data
Promise.all([
  d3.json("world.geo.json"),
  d3.csv("noc_regions.csv"),
  d3.csv("athlete_events.csv")
]).then(([world, nocRegions, athleteData]) => {

  // Map NOC to region
  const nocToRegion = new Map();
  nocRegions.forEach(d => {
    nocToRegion.set(d.NOC, d.region);
  });

  // Medal counter per region
  const medalData = {};

  athleteData.forEach(d => {
    const region = nocToRegion.get(d.NOC);
    if (!region || !d.Medal) return;

    if (!medalData[region]) {
      medalData[region] = { gold: 0, silver: 0, bronze: 0 };
    }

    if (d.Medal === "Gold") medalData[region].gold++;
    if (d.Medal === "Silver") medalData[region].silver++;
    if (d.Medal === "Bronze") medalData[region].bronze++;
  });

  const projection = d3.geoMercator()
    .scale(140)
    .translate([width / 2, height / 1.5]);

  const path = d3.geoPath().projection(projection);

  svg.selectAll("path")
    .data(world.features)
    .join("path")
    .attr("class", "country")
    .attr("d", path)
    .on("mouseover", (event, d) => {
      const region = d.properties.name;
      const data = medalData[region];

      d3.select(event.currentTarget).attr("fill", "orange");

      tooltip
        .style("left", event.pageX + 10 + "px")
        .style("top", event.pageY + "px")
        .classed("hidden", false)
        .html(`
          <strong>${region}</strong><br>
          🥇 ${data?.gold || 0}<br>
          🥈 ${data?.silver || 0}<br>
          🥉 ${data?.bronze || 0}
        `);
    })
    .on("mouseout", (event, d) => {
      d3.select(event.currentTarget).attr("fill", "#d3d3d3");
      tooltip.classed("hidden", true);
    });

    const hostCitiesRaw = Array.from(
  d3.group(athleteData, d => `${d.City}_${d.Year}_${d.Season}`),
  ([key]) => {
    const [city, year, season] = key.split("_");
    return { city, year: +year, season };
  }
);

svg.selectAll("circle")
  .data(hostCitiesRaw.filter(d => cityCoordinates[d.city]))
  .join("circle")
  .attr("cx", d => projection(cityCoordinates[d.city])[0])
  .attr("cy", d => projection(cityCoordinates[d.city])[1])
  .attr("r", 5)
  .attr("fill", "red")
  .attr("stroke", "black")
  .attr("stroke-width", 1)
  .style("cursor", "pointer")
  .on("mouseover", (event, d) => {
    tooltip
      .style("left", event.pageX + 10 + "px")
      .style("top", event.pageY + "px")
      .classed("hidden", false)
      .html(
        `${d.season === "Summer" ? "Ljetne" : "Zimske"} olimpijske igre<br>` +
        `${d.city}, ${d.year}`
      );
  })
  .on("mouseout", () => {
    tooltip.classed("hidden", true);
  });
});
