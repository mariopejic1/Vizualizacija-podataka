const width = 1060;
const height = 700;
const svg = d3.select("#map")
  .attr("width", width)
  .attr("height", height);

const tooltip = d3.select("#tooltip");

const cityCoordinates = {
  "Athens": [23.7275, 37.9838],
  "Paris": [2.3522, 48.8566],
  "St. Louis": [-90.1994, 38.6270],
  "London": [-0.1278, 51.5074],
  "Stockholm": [18.0686, 59.3293],
  "Antwerp": [4.4028, 51.2194],
  "Amsterdam": [4.9041, 52.3676],
  "Los Angeles": [-118.2437, 34.0522],
  "Berlin": [13.4050, 52.5200],
  "Helsinki": [24.9355, 60.1695],
  "Melbourne": [144.9631, -37.8136],
  "Rome": [12.4964, 41.9028],
  "Tokyo": [139.6917, 35.6895],
  "Mexico City": [-99.1332, 19.4326],
  "Munich": [11.5820, 48.1351],
  "Montreal": [-73.5673, 45.5017],
  "Moscow": [37.6173, 55.7558],
  "Seoul": [126.9780, 37.5665],
  "Barcelona": [2.1734, 41.3851],
  "Atlanta": [-84.3880, 33.7490],
  "Sydney": [151.2093, -33.8688],
  "Beijing": [116.4074, 39.9042],
  "Rio de Janeiro": [-43.1729, -22.9068],

  "Chamonix": [6.8694, 45.9237],
  "St. Moritz": [9.8451, 46.4970],
  "Lake Placid": [-73.9793, 44.2795],
  "Garmisch-Partenkirchen": [11.1000, 47.5000],
  "Oslo": [10.7522, 59.9139],
  "Cortina d'Ampezzo": [12.1357, 46.5383],
  "Innsbruck": [11.4004, 47.2692],
  "Grenoble": [5.7245, 45.1885],
  "Sapporo": [141.3545, 43.0642],
  "Sarajevo": [18.4131, 43.8563],
  "Calgary": [-114.0719, 51.0447],
  "Albertville": [6.3900, 45.6769],
  "Lillehammer": [10.5000, 61.1167],
  "Nagano": [138.1947, 36.6486],
  "Salt Lake City": [-111.8910, 40.7608],
  "Turin": [7.6869, 45.0703],
  "Vancouver": [-123.1207, 49.2827],
  "Sochi": [39.7260, 43.6028],
  "Pyeongchang": [128.3900, 37.3700]
};

Promise.all([
  d3.json("world.geo.json"),
  d3.csv("noc_regions.csv"),
  d3.csv("athlete_events.csv")
]).then(([world, nocRegions, athleteData]) => {

  const nocToRegion = new Map();
  nocRegions.forEach(d => {
    nocToRegion.set(d.NOC, d.region);
  });

  
  const medalData = {};
  athleteData.forEach(d => {
    const region = nocToRegion.get(d.NOC);
    if (!region || !d.Medal) return;
    if (!medalData[region]) medalData[region] = { gold: 0, silver: 0, bronze: 0 };
    if (d.Medal === "Gold") medalData[region].gold++;
    else if (d.Medal === "Silver") medalData[region].silver++;
    else if (d.Medal === "Bronze") medalData[region].bronze++;
  });

  const projection = d3.geoMercator()
    .scale(160)
    .translate([width / 2, height / 1.5]);

  const path = d3.geoPath().projection(projection);

  const mapGroup = svg.append("g").attr("class", "map-group");

  mapGroup.selectAll("path")
    .data(world.features)
    .join("path")
    .attr("class", "country")
    .attr("d", path)
    .attr("fill", "#d3d3d3")
    .attr("stroke", "#999")
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

  // Grupiraj sve igre po gradu
const hostCityGroups = d3.group(
  athleteData.filter(d => cityCoordinates[d.City]),
  d => d.City
);

// Za svaki grad, napravi točku i tooltip s popisom godina i sezona
const hostCities = Array.from(hostCityGroups, ([city, events]) => {
  const games = Array.from(
    d3.group(events, d => `${d.Year}_${d.Season}`),
    ([key]) => {
      const [year, season] = key.split("_");
      return { year, season };
    }
  );
  return { city, games };
});

mapGroup.selectAll("g.city")
  .data(hostCities)
  .join("g")
  .attr("class", "city")
  .attr("transform", d => {
    const [x, y] = projection(cityCoordinates[d.city]);
    return `translate(${x},${y})`;
  })
  .each(function (d) {
    const group = d3.select(this);

    group.append("circle")
      .attr("r", 1.5)
      .attr("fill", "red")
      .attr("stroke", "black")
      .attr("stroke-width", 0.5)
      .style("cursor", "pointer")
      .on("mouseover", (event) => {
        const tooltipContent = `
          <strong>${d.city}</strong><br>
          ${d.games.map(g => {
            const season = g.season === "Summer" ? "Ljetne Olimpijske igre:" : "Zimske Olimpijske igre:";
            return `${season} ${g.year}`;
          }).join("<br>")}
        `;

        tooltip
          .style("left", event.pageX + 10 + "px")
          .style("top", event.pageY + "px")
          .classed("hidden", false)
          .html(tooltipContent);
      })
      .on("mouseout", () => {
        tooltip.classed("hidden", true);
      });

    group.append("text")
      .text(d.city)
      .attr("x", 2.5)        // malo više udesno od točke
      .attr("y", 1)        // malo niže radi bolje čitljivosti
      .attr("font-size", "1.5px")
      .attr("fill", "black")
      .style("pointer-events", "none")  // da ne smeta mouse eventima
      .style("display", "none");         // skriveno na početku
  });

const zoom = d3.zoom()
  .scaleExtent([1, 8])
  .on("zoom", (event) => {
    mapGroup.attr("transform", event.transform);

    // Pokaži tekst samo ako je zoom veći od 2
    mapGroup.selectAll("g.city text")
      .style("display", event.transform.k > 3 ? "block" : "none");
  });

svg.call(zoom);

  // --- Bar Chart ---
  const barSvg = d3.select("#barChart");
  const chartMargin = { top: 30, right: 20, bottom: 50, left: 150 };
  const chartWidth = +barSvg.attr("width") - chartMargin.left - chartMargin.right;
  const chartHeight = +barSvg.attr("height") - chartMargin.top - chartMargin.bottom;

  const chartGroup = barSvg.append("g")
    .attr("transform", `translate(${chartMargin.left},${chartMargin.top})`);

  const dataArray = Object.entries(medalData).map(([region, d]) => ({
    region,
    ...d,
    total: d.gold + d.silver + d.bronze
  }));

  const topCountries = dataArray
    .sort((a, b) => d3.descending(a.total, b.total))
    .slice(0, 10);

  const maxTotal = d3.max(topCountries, d => d.total);
  const niceMax = Math.ceil(maxTotal / 10) * 10; // zaokruži naviše na najbližih 10

  const x = d3.scaleLinear()
    .domain([0, niceMax])
    .range([0, chartWidth])
    .nice();

  const y = d3.scaleBand()
    .domain(topCountries.map(d => d.region))
    .range([0, chartHeight])
    .padding(0.2);

  const colors = {
    gold: "#FFD700",
    silver: "#C0C0C0",
    bronze: "#CD7F32"
  };

  chartGroup.selectAll("g.bar")
    .data(topCountries)
    .join("g")
    .attr("class", "bar")
    .attr("transform", d => `translate(0,${y(d.region)})`)
    .each(function (d) {
      const g = d3.select(this);
      let offset = 0;

      ["gold", "silver", "bronze"].forEach(key => {
        const value = d[key];
        const width = x(value);

        g.append("rect")
          .attr("x", offset)
          .attr("width", width)
          .attr("height", y.bandwidth())
          .attr("fill", colors[key]);

        if (width > 15) {
          g.append("text")
            .attr("x", offset + width / 2)
            .attr("y", y.bandwidth() / 2)
            .attr("dy", "0.35em")
            .attr("text-anchor", "middle")
            .attr("fill", "black")
            .attr("font-size", "10px")
            .attr("font-weight", "bold")
            .text(value);
        }

        offset += width;
      });
    });

  chartGroup.append("g").call(d3.axisLeft(y));
  chartGroup.append("g")
  .attr("transform", `translate(0,${chartHeight})`)
  .call(d3.axisBottom(x)
    .ticks(5) 
    .tickFormat(d3.format("d")) 
  );
});
