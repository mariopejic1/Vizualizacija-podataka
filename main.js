const width = 960;
const height = 700;
const svg = d3.select("#map")
  .attr("width", width)
  .attr("height", height)
  .style("opacity", 0);

const barSvg = d3.select("#barChart")
  .style("opacity", 0);

const tooltip = d3.select("#tooltip");

// Hard - kodirani podaci o gradovima domaćinima Olimpijskih igara
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

// Učitavanje svih skupova podataka korištenih na početnoj stranici poradi stvaranja interaktivne karte, rada s kartom, bojanja karte 
// prikaza detalja o državama i gradovima domaćinima, prikaz najuspješnijih država 
Promise.all([
  d3.json("world.geo.json"),
  d3.csv("noc_regions.csv"),
  d3.csv("athlete_events.csv")
]).then(([world, nocRegions, athleteData]) => {
  const nocToRegion = new Map();
  nocRegions.forEach(d => {
    nocToRegion.set(d.NOC, d.region);
  });

  const medalData = athleteData.filter(d => d.Medal === "Gold" || d.Medal === "Silver" || d.Medal === "Bronze");

  const countryMedals = {};
  medalData.forEach(d => {
    const region = nocToRegion.get(d.NOC);
    if (!region) return;
    if (!countryMedals[region]) countryMedals[region] = { gold: 0, silver: 0, bronze: 0 };
    if (d.Medal === "Gold") countryMedals[region].gold++;
    if (d.Medal === "Silver") countryMedals[region].silver++;
    if (d.Medal === "Bronze") countryMedals[region].bronze++;
  });

  const cityMedals = {};
  medalData.forEach(d => {
    const city = d.City;
    const region = nocToRegion.get(d.NOC);
    const year = +d.Year;
    const athleteKey = `${d.ID}_${d.Name}`;
    const athleteName = d.Name;
    const cityKey = Object.keys(cityCoordinates).find(k => k.toLowerCase() === city?.toLowerCase());
    if (!city || !region || !athleteName || !cityKey) return;
    if (!cityMedals[cityKey]) cityMedals[cityKey] = { years: new Set(), medalsByYear: {} };
    cityMedals[cityKey].years.add(year);
    if (!cityMedals[cityKey].medalsByYear[year]) {
      cityMedals[cityKey].medalsByYear[year] = { countries: {}, athletes: {} };
    }
    if (!cityMedals[cityKey].medalsByYear[year].countries[region]) {
      cityMedals[cityKey].medalsByYear[year].countries[region] = { gold: 0, silver: 0, bronze: 0 };
    }
    if (!cityMedals[cityKey].medalsByYear[year].athletes[athleteKey]) {
      cityMedals[cityKey].medalsByYear[year].athletes[athleteKey] = { name: athleteName, gold: 0, silver: 0, bronze: 0 };
    }
    if (d.Medal === "Gold") {
      cityMedals[cityKey].medalsByYear[year].countries[region].gold++;
      cityMedals[cityKey].medalsByYear[year].athletes[athleteKey].gold++;
    } else if (d.Medal === "Silver") {
      cityMedals[cityKey].medalsByYear[year].countries[region].silver++;
      cityMedals[cityKey].medalsByYear[year].athletes[athleteKey].silver++;
    } else if (d.Medal === "Bronze") {
      cityMedals[cityKey].medalsByYear[year].countries[region].bronze++;
      cityMedals[cityKey].medalsByYear[year].athletes[athleteKey].bronze++;
    }
  });
  Object.values(cityMedals).forEach(city => {
    city.years = Array.from(city.years).sort((a, b) => a - b);
  });

  const medalsByYear = {};
  medalData.forEach(d => {
    const region = nocToRegion.get(d.NOC);
    const year = +d.Year;
    if (!region) return;
    if (!medalsByYear[region]) medalsByYear[region] = {};
    if (!medalsByYear[region][year]) medalsByYear[region][year] = { gold: 0, silver: 0, bronze: 0 };
    if (d.Medal === "Gold") medalsByYear[region][year].gold++;
    if (d.Medal === "Silver") medalsByYear[region][year].silver++;
    if (d.Medal === "Bronze") medalsByYear[region][year].bronze++;
  });

  const athleteMedals = {};
  medalData.forEach(d => {
    const region = nocToRegion.get(d.NOC);
    const athleteKey = `${d.ID}_${d.Name}`;
    const athlete = d.Name;
    if (!region || !athlete) return;
    if (!athleteMedals[region]) athleteMedals[region] = {};
    if (!athleteMedals[region][athleteKey]) {
      athleteMedals[region][athleteKey] = { name: athlete, gold: 0, silver: 0, bronze: 0 };
    }
    if (d.Medal === "Gold") athleteMedals[region][athleteKey].gold++;
    else if (d.Medal === "Silver") athleteMedals[region][athleteKey].silver++;
    else if (d.Medal === "Bronze") athleteMedals[region][athleteKey].bronze++;
  });

  const disciplineMedals = {};
  medalData.forEach(d => {
    const region = nocToRegion.get(d.NOC);
    const sport = d.Sport;
    if (!region || !sport) return;
    if (!disciplineMedals[region]) disciplineMedals[region] = {};
    if (!disciplineMedals[region][sport]) disciplineMedals[region][sport] = { gold: 0, silver: 0, bronze: 0 };
    if (d.Medal === "Gold") disciplineMedals[region][sport].gold++;
    if (d.Medal === "Silver") disciplineMedals[region][sport].silver++;
    if (d.Medal === "Bronze") disciplineMedals[region][sport].bronze++;
  });

  const projection = d3.geoMercator()
    .scale(160)
    .translate([width / 2, height / 1.5]);
  const path = d3.geoPath().projection(projection);

  const maxMedals = Math.min(250, d3.max(Object.values(countryMedals), d => d.gold + d.silver + d.bronze) || 1);
  const colorScale = d3.scaleSequential()
  .domain([0, maxMedals])
  .range(['#F5FAFF', '#B3D9FF', '#003366']); 

  const mapGroup = svg.append("g").attr("class", "map-group");

  mapGroup.selectAll("path")
    .data(world.features)
    .join("path")
    .attr("class", "country")
    .attr("d", path)
    .attr("fill", d => {
    const region = d.properties.name;
    const medals = countryMedals[region] || { gold: 0, silver: 0, bronze: 0 };
    return colorScale(medals.gold + medals.silver + medals.bronze);
  })
    .attr("stroke", "#999")
    .on("mouseover", (event, d) => {
      const region = d.properties.name;
      const data = countryMedals[region] || { gold: 0, silver: 0, bronze: 0 };
      d3.select(event.currentTarget).attr("fill", "#1E90FF");
      tooltip
        .style("left", `${event.pageX + 10}px`)
        .style("top", `${event.pageY + 10}px`)
        .classed("hidden", false)
        .html(`
          <h4><strong>${region}</strong></h4>
          <p>🥇 ${data.gold}</p>
          <p>🥈 ${data.silver}</p>
          <p>🥉 ${data.bronze}</p>
          <p>Total: ${data.gold + data.silver + data.bronze}</p>
        `);
    })
    .on("mouseout", (event, d) => {
      const region = d.properties.name;
      const medals = countryMedals[region] || { gold: 0, silver: 0, bronze: 0 };
      d3.select(event.currentTarget).attr("fill", colorScale(medals.gold + medals.silver + medals.bronze));
      tooltip.classed("hidden", true);
    })
    .on("click", (event, d) => {
      const region = d.properties.name;
      const data = countryMedals[region] || { gold: 0, silver: 0, bronze: 0 };
      data.country = region;
      data.total = data.gold + data.silver + data.bronze;
      updateDetails(data, 'country');
      updateCountryCharts(region);
      document.getElementById('countryChartsContainer').scrollIntoView({ behavior: 'smooth' });
    });

  const hostCitiesData = Object.keys(cityMedals).map(city => ({
    city,
    games: Array.from(cityMedals[city].years).map(year => ({
      year,
      season: medalData.find(d => d.City === city && +d.Year === year)?.Season || "Summer"
    })).sort((a, b) => a.year - b.year)
  }));

  mapGroup.selectAll("g.city")
    .data(hostCitiesData)
    .join("g")
    .attr("class", "city")
    .attr("transform", d => {
      const [x, y] = projection(cityCoordinates[d.city]);
      return `translate(${x},${y})`;
    })
    .each(function(d) {
      const group = d3.select(this);
      group.append("circle")
        .attr("r", 5)
        .attr("fill", "red")
        .attr("stroke", "black")
        .attr("stroke-width", 0.5)
        .style("cursor", "pointer")
        .style("pointer-events", "all")
        .on("mouseover", (event) => {
          const tooltipContent = `
            <strong>${d.city}</strong><br>
            ${d.games.map(g => {
              const season = g.season === "Summer" ? "Summer Olympics" : "Winter Olympics";
              return `${season}: ${g.year}`;
            }).join("<br>")}
          `;
          tooltip
            .style("left", `${event.pageX + 10}px`)
            .style("top", `${event.pageY + 10}px`)
            .classed("hidden", false)
            .html(tooltipContent);
        })
        .on("mouseout", () => {
          tooltip.classed("hidden", true);
        })
        .on("click", (event) => {
          d3.select("#hostCityWrapper").style("display", "block");
          const year = d.games[0]?.year || cityMedals[d.city].years[0] || 1896;
          updateHostCityCharts(d.city, year);
          updateYearSelect(d.city, d.games);
          d3.select('#countryChartsContainer').style('display', 'none');
          document.getElementById('hostCityWrapper').scrollIntoView({ behavior: 'smooth' });
        });

      group.append("text")
        .text(d.city)
        .attr("x", 5.5)
        .attr("y", 2)
        .attr("font-size", "4px")
        .attr("fill", "black")
        .style("pointer-events", "none")
        .style("display", "none");
    });

  const zoom = d3.zoom()
    .scaleExtent([1, 8])
    .on("zoom", (event) => {
      mapGroup.attr("transform", event.transform);
      mapGroup.selectAll("g.city text")
        .style("display", event.transform.k > 2.5 ? "block" : "none");
      mapGroup.selectAll("g.city circle")
        .attr("r", 5 / event.transform.k);
    });
  svg.call(zoom);

  const chartMargin = { top: 30, right: 20, bottom: 50, left: 150 };
  const chartHeight = 600 - chartMargin.top - chartMargin.bottom;

  const chartGroup = barSvg.append("g")
    .attr("transform", `translate(${chartMargin.left},${chartMargin.top})`);

  const colors = {
    total: "#4682B4",
    gold: "#FFD700",
    silver: "#C0C0C0",
    bronze: "#CD7F32"
  };

  const dataArray = Object.entries(countryMedals).map(([region, d]) => ({
    region,
    ...d,
    total: d.gold + d.silver + d.bronze
  })).filter(d => d.total > 0);

  function updateTopCountriesBar(sortBy = "total") {
  const chartWidth = barSvg.node().getBoundingClientRect().width - chartMargin.left - chartMargin.right;

  let sortedCountries = dataArray.slice();
  sortedCountries.sort((a, b) => d3.descending(a[sortBy], b[sortBy]) || a.region.localeCompare(b.region));

  const topCountries = sortedCountries.slice(0, 10);

  const maxValue = d3.max(topCountries, d => d[sortBy]) || 1;
  const niceMax = Math.ceil(maxValue / 10) * 10;

  const x = d3.scaleLinear()
    .domain([0, niceMax])
    .range([0, chartWidth])
    .nice();

  const y = d3.scaleBand()
    .domain(topCountries.map(d => d.region))
    .range([0, chartHeight])
    .padding(0.2);

  const bars = chartGroup.selectAll("g.bar")
    .data(topCountries, d => d.region);

  const barsEnter = bars.enter()
    .append("g")
    .attr("class", "bar")
    .attr("transform", d => `translate(0,${y(d.region)})`);

  const barsMerge = barsEnter.merge(bars);

  barsMerge.transition()
    .duration(1000)
    .attr("transform", d => `translate(0,${y(d.region)})`);

  barsMerge.selectAll("rect")
    .data(d => [d])
    .join(
      enter => enter.append("rect")
        .attr("class", sortBy)
        .attr("x", 0)
        .attr("width", 0)
        .attr("height", y.bandwidth())
        .attr("fill", d => colors[sortBy])
        .call(enter => enter.transition().duration(1000).attr("width", d => x(d[sortBy]))),
      update => update
        .transition()
        .duration(1000)
        .attr("width", d => x(d[sortBy]))
        .attr("fill", d => colors[sortBy]),
      exit => exit.remove()
    );

  barsMerge.selectAll("text")
    .data(d => [d])
    .join(
      enter => enter.append("text")
        .attr("class", sortBy)
        .attr("x", d => x(d[sortBy]) / 2)
        .attr("y", y.bandwidth() / 2)
        .attr("dy", "0.35em")
        .attr("text-anchor", "middle")
        .attr("fill", "#fff")
        .attr("font-size", "10px")
        .attr("font-weight", "bold")
        .text(d => x(d[sortBy]) > 30 ? d[sortBy] : ""),
      update => update
        .transition()
        .duration(1000)
        .attr("x", d => x(d[sortBy]) / 2)
        .text(d => x(d[sortBy]) > 30 ? d[sortBy] : ""),
      exit => exit.remove()
    );

  bars.exit().transition().duration(1000).attr("opacity", 0).remove();

  chartGroup.selectAll(".y-axis").data([0])
    .join("g")
    .attr("class", "y-axis")
    .transition()
    .duration(1000)
    .call(d3.axisLeft(y));

  chartGroup.selectAll(".x-axis").data([0])
    .join("g")
    .attr("class", "x-axis")
    .attr("transform", `translate(0,${chartHeight})`)
    .transition()
    .duration(1000)
    .call(d3.axisBottom(x).ticks(5).tickFormat(d3.format("d")));
}

function waitForSvgAndInit() {
  const svgNode = barSvg.node();
  if (svgNode && svgNode.getBoundingClientRect().width > 0) {
    d3.select("#sort-countries").property("value", "total");
    updateTopCountriesBar("total");
  } else {
    requestAnimationFrame(waitForSvgAndInit);
  }
}

waitForSvgAndInit();

d3.select("#sort-countries").on("change", function () {
  updateTopCountriesBar(this.value);
});


    let selectedCity = null;
    let selectedYear = null;

    function updateYearSelect(city, games) {
      selectedCity = city;
      d3.select("#yearSelect")
        .selectAll("option")
        .data(games)
        .join("option")
        .attr("value", d => d.year)
        .text(d => `${d.year} (${d.season})`);
      selectedYear = games[0]?.year || cityMedals[city].years[0] || 1896;
      d3.select("#yearSelect").property("value", selectedYear);
    }

    d3.select("#yearSelect").on("change", function() {
      selectedYear = +this.value;
      updateHostCityCharts(selectedCity, selectedYear);
    });

  function updateHostCityCharts(city, year) {
    selectedCity = city;
    selectedYear = year;

    d3.select("#hostCityWrapper").style("display", "block");

    const yearSelect = d3.select("#yearSelect");
    const years = cityMedals[city]?.years || [];
    yearSelect.selectAll("option").remove();
    yearSelect.selectAll("option")
      .data(years)
      .enter()
      .append("option")
      .attr("value", d => d)
      .text(d => {
        const season = medalData.find(m => m.City.toLowerCase() === city.toLowerCase() && +m.Year === d)?.Season || "Summer";
        return `${d} (${season})`;
      });
    yearSelect.property("value", year);
    yearSelect.on("change", function() {
      updateHostCityCharts(city, +this.value);
    });

    const countrySvg = d3.select("#topCityCountriesChart");
    countrySvg.selectAll("*").remove();
    const countryMargin = { top: 20, right: 20, bottom: 50, left: 150 };
    const countryWidth = +countrySvg.attr("width") - countryMargin.left - countryMargin.right;
    const countryHeight = +countrySvg.attr("height") - countryMargin.top - countryMargin.bottom;
    const countryGroup = countrySvg.append("g")
      .attr("transform", `translate(${countryMargin.left},${countryMargin.top})`);

    const countryData = Object.entries(cityMedals[city]?.medalsByYear[year]?.countries || {})
      .map(([region, medals]) => ({
        region,
        ...medals,
        total: medals.gold + medals.silver + medals.bronze
      }))
      .sort((a, b) => b.total - a.total || a.region.localeCompare(b.region))
      .slice(0, 10);

    if (countryData.length === 0) {
      countrySvg.append("text")
        .attr("x", countryWidth / 2)
        .attr("y", countryHeight / 2)
        .attr("text-anchor", "middle")
        .text("No data for countries");
    } else {
      const xCountry = d3.scaleLinear()
        .domain([0, d3.max(countryData, d => d.total) || 1])
        .range([0, countryWidth])
        .nice();

      const yCountry = d3.scaleBand()
        .domain(countryData.map(d => d.region))
        .range([0, countryHeight])
        .padding(0.2);

      countryGroup.selectAll("g.bar")
        .data(countryData, d => `${city}_${year}_${d.region}`)
        .join("g")
        .attr("class", "bar")
        .attr("transform", d => `translate(0,${yCountry(d.region)})`)
        .each(function(d) {
          const g = d3.select(this);
          let offset = 0;
          ["gold", "silver", "bronze"].forEach(key => {
            const value = d[key];
            const width = xCountry(value);
            g.append("rect")
              .attr("x", offset)
              .attr("width", 0)
              .attr("height", yCountry.bandwidth())
              .attr("fill", colors[key])
              .transition()
              .duration(1000)
              .attr("width", width);
            if (width > 15) {
              g.append("text")
                .attr("x", offset + width / 2)
                .attr("y", yCountry.bandwidth() / 2)
                .attr("dy", "0.35em")
                .attr("text-anchor", "middle")
                .attr("fill", "black")
                .attr("font-size", "10px")
                .text(value);
            }
            offset += width;
          });
        });

      countryGroup.append("g")
        .attr("class", "axis")
        .call(d3.axisLeft(yCountry));

      countryGroup.append("g")
        .attr("class", "axis")
        .attr("transform", `translate(0,${countryHeight})`)
        .call(d3.axisBottom(xCountry).ticks(5).tickFormat(d3.format("d")));
    }

    const athleteSvg = d3.select("#topCityAthletesChart");
    athleteSvg.selectAll("*").remove();
    const athleteMargin = { top: 20, right: 20, bottom: 50, left: 200 };
    const athleteWidth = +athleteSvg.attr("width") - athleteMargin.left - athleteMargin.right;
    const athleteHeight = +athleteSvg.attr("height") - athleteMargin.top - athleteMargin.bottom;
    const athleteGroup = athleteSvg.append("g")
      .attr("transform", `translate(${athleteMargin.left},${athleteMargin.top})`);

    const athleteData = Object.entries(cityMedals[city]?.medalsByYear[year]?.athletes || {})
      .map(([athleteKey, medals]) => ({
        key: athleteKey,
        name: medals.name,
        displayName: medals.name.length > 20 ? medals.name.slice(0, 20) + "…" : medals.name,
        ...medals,
        total: medals.gold + medals.silver + medals.bronze
      }))
      .filter(d => d.total > 0)
      .sort((a, b) => b.total - a.total || a.name.localeCompare(b.name))
      .slice(0, 10);

    if (athleteData.length === 0) {
      athleteSvg.append("text")
        .attr("x", athleteWidth / 2)
        .attr("y", athleteHeight / 2)
        .attr("text-anchor", "middle")
        .text("No data for athletes");
    } else {
      const xAthlete = d3.scaleLinear()
        .domain([0, d3.max(athleteData, d => d.total) || 1])
        .range([0, athleteWidth])
        .nice();
      const yAthlete = d3.scaleBand()
        .domain(athleteData.map(d => d.displayName))
        .range([0, athleteHeight])
        .padding(0.2);

      athleteGroup.selectAll("g.bar")
        .data(athleteData, d => d.key)
        .join("g")
        .attr("class", "bar")
        .attr("transform", d => `translate(0,${yAthlete(d.displayName)})`)
        .each(function(d) {
          const g = d3.select(this);
          let offset = 0;
          ["gold", "silver", "bronze"].forEach(key => {
            const value = d[key];
            const width = xAthlete(value);
            g.append("rect")
              .attr("x", offset)
              .attr("width", 0)
              .attr("height", yAthlete.bandwidth())
              .attr("fill", colors[key])
              .transition()
              .duration(1000)
              .attr("width", width);
            if (width > 15) {
              g.append("text")
                .attr("x", offset + width / 2)
                .attr("y", yAthlete.bandwidth() / 2)
                .attr("dy", "0.35em")
                .attr("text-anchor", "middle")
                .attr("fill", "black")
                .attr("font-size", "10px")
                .text(value);
            }
            offset += width;
          });
        });

      athleteGroup.selectAll(".bar-label")
        .data(athleteData, d => d.key)
        .join("text")
        .attr("class", "bar-label")
        .attr("x", -5)
        .attr("y", d => yAthlete(d.displayName) + yAthlete.bandwidth() / 2)
        .attr("dy", "0.35em")
        .attr("text-anchor", "end")
        .on("mouseover", (event, d) => {
          tooltip
            .style("left", `${event.pageX + 10}px`)
            .style("top", `${event.pageY + 10}px`)
            .classed("hidden", false)
            .html(d.name);
        })
        .on("mouseout", () => {
          tooltip.classed("hidden", true);
        });

      athleteGroup.append("g")
        .attr("class", "axis")
        .call(d3.axisLeft(yAthlete));

      athleteGroup.append("g")
        .attr("class", "axis")
        .attr("transform", `translate(0,${athleteHeight})`)
        .call(d3.axisBottom(xAthlete).ticks(5).tickFormat(d3.format("d")));
    }

    const cityData = Object.entries(cityMedals[city]?.medalsByYear[year]?.countries || {})
      .map(([country, medals]) => ({
        country,
        ...medals,
        total: medals.gold + medals.silver + medals.bronze
      }))
      .sort((a, b) => b.total - a.total || a.country.localeCompare(b.country))
      .slice(0, 10);
    cityData.city = city;
    updateDetails(cityData, 'city');
  }

  function updateCountryCharts(region) {
    d3.select("#countryChartsContainer").style("display", "block");
    d3.select("#medalsByYearChart").selectAll("*").remove();
    d3.select("#topAthletesChart").selectAll("*").remove();
    d3.select("#topDisciplinesChart").selectAll("*").remove();

    const yearData = Object.entries(medalsByYear[region] || {})
      .map(([year, medals]) => ({
        year: +year,
        total: medals.gold + medals.silver + medals.bronze
      }))
      .sort((a, b) => a.year - b.year);

    const yearSvg = d3.select("#medalsByYearChart");
    const yearMargin = { top: 20, right: 20, bottom: 50, left: 50 };
    const yearWidth = +yearSvg.attr("width") - yearMargin.left - yearMargin.right;
    const yearHeight = +yearSvg.attr("height") - yearMargin.top - yearMargin.bottom;
    const yearGroup = yearSvg.append("g")
      .attr("transform", `translate(${yearMargin.left},${yearMargin.top})`);

    const xYear = d3.scaleLinear()
      .domain([1896, 2016])
      .range([0, yearWidth]);

    const yYear = d3.scaleLinear()
      .domain([0, d3.max(yearData, d => d.total) || 1])
      .range([yearHeight, 0])
      .nice();

    const line = d3.line()
      .x(d => xYear(d.year))
      .y(d => yYear(d.total));

    yearGroup.append("path")
      .datum(yearData)
      .attr("fill", "none")
      .attr("stroke", "steelblue")
      .attr("stroke-width", 1.5)
      .attr("d", line);

    yearGroup.selectAll(".dot")
      .data(yearData)
      .join("circle")
      .attr("class", "dot")
      .attr("cx", d => xYear(d.year))
      .attr("cy", d => yYear(d.total))
      .attr("r", 3)
      .attr("fill", "steelblue")
      .on("mouseover", (event, d) => {
        tooltip
          .style("left", `${event.pageX + 10}px`)
          .style("top", `${event.pageY + 10}px`)
          .classed("hidden", false)
          .html(`Year: ${d.year}<br>Total: ${d.total}`);
      })
      .on("mouseout", () => {
        tooltip.classed("hidden", true);
      });

    yearGroup.append("g")
      .attr("class", "axis")
      .attr("transform", `translate(0,${yearHeight})`)
      .call(d3.axisBottom(xYear).tickFormat(d3.format("d")));

    yearGroup.append("g")
      .attr("class", "axis")
      .call(d3.axisLeft(yYear).ticks(5));

    const athleteData = Object.entries(athleteMedals[region] || {})
      .map(([key, medals]) => ({
        key,
        athlete: medals.name,
        displayAthlete: medals.name.length > 20 ? medals.name.slice(0, 20) + "…" : medals.name,
        ...medals,
        total: medals.gold + medals.silver + medals.bronze
      }))
      .sort((a, b) => b.total - a.total || a.athlete.localeCompare(b.athlete))
      .slice(0, 10);

    const athleteSvg = d3.select("#topAthletesChart");
    const athleteMargin = { top: 20, right: 20, bottom: 50, left: 200 };
    const athleteWidth = +athleteSvg.attr("width") - athleteMargin.left - athleteMargin.right;
    const athleteHeight = +athleteSvg.attr("height") - athleteMargin.top - athleteMargin.bottom;
    const athleteGroup = athleteSvg.append("g")
      .attr("transform", `translate(${athleteMargin.left},${athleteMargin.top})`);

    const xAthlete = d3.scaleLinear()
      .domain([0, d3.max(athleteData, d => d.total) || 1])
      .range([0, athleteWidth])
      .nice();

    const yAthlete = d3.scaleBand()
      .domain(athleteData.map(d => d.displayAthlete))
      .range([0, athleteHeight])
      .padding(0.2);

    athleteGroup.selectAll("g.bar")
      .data(athleteData, d => d.key)
      .join("g")
      .attr("class", "bar")
      .attr("transform", d => `translate(0,${yAthlete(d.displayAthlete)})`)
      .each(function(d) {
        const g = d3.select(this);
        let offset = 0;
        ["gold", "silver", "bronze"].forEach(key => {
          const value = d[key];
          const width = xAthlete(value);
          g.append("rect")
            .attr("x", offset)
            .attr("width", width)
            .attr("height", yAthlete.bandwidth())
            .attr("fill", colors[key]);
          if (width > 15) {
            g.append("text")
              .attr("x", offset + width / 2)
              .attr("y", yAthlete.bandwidth() / 2)
              .attr("dy", "0.35em")
              .attr("text-anchor", "middle")
              .attr("fill", "black")
              .attr("font-size", "10px")
              .text(value);
          }
          offset += width;
        });
      });

    athleteGroup.selectAll(".bar-label")
      .data(athleteData, d => d.key)
      .join("text")
      .attr("class", "bar-label")
      .attr("x", -5)
      .attr("y", d => yAthlete(d.displayAthlete) + yAthlete.bandwidth() / 2)
      .attr("dy", "0.35em")
      .attr("text-anchor", "end")
      .on("mouseover", (event, d) => {
        tooltip
          .style("left", `${event.pageX + 10}px`)
          .style("top", `${event.pageY + 10}px`)
          .classed("hidden", false)
          .html(d.athlete);
      })
      .on("mouseout", () => {
        tooltip.classed("hidden", true);
      });

    athleteGroup.append("g")
      .attr("class", "axis")
      .attr("transform", `translate(0,${athleteHeight})`)
      .call(d3.axisBottom(xAthlete).ticks(5).tickFormat(d3.format("d")));

    athleteGroup.append("g")
      .attr("class", "axis")
      .call(d3.axisLeft(yAthlete));

    const disciplineData = Object.entries(disciplineMedals[region] || {})
      .map(([sport, medals]) => ({
        sport,
        displaySport: sport.length > 20 ? sport.slice(0, 20) + "…" : sport,
        ...medals,
        total: medals.gold + medals.silver + medals.bronze
      }))
      .sort((a, b) => b.total - a.total || a.sport.localeCompare(b.sport))
      .slice(0, 10);

    const disciplineSvg = d3.select("#topDisciplinesChart");
    const disciplineMargin = { top: 20, right: 20, bottom: 50, left: 200 };
    const disciplineWidth = +disciplineSvg.attr("width") - disciplineMargin.left - disciplineMargin.right;
    const disciplineHeight = +disciplineSvg.attr("height") - disciplineMargin.top - disciplineMargin.bottom;
    const disciplineGroup = disciplineSvg.append("g")
      .attr("transform", `translate(${disciplineMargin.left},${disciplineMargin.top})`);

    const xDiscipline = d3.scaleLinear()
      .domain([0, d3.max(disciplineData, d => d.total) || 1])
      .range([0, disciplineWidth])
      .nice();

    const yDiscipline = d3.scaleBand()
      .domain(disciplineData.map(d => d.displaySport))
      .range([0, disciplineHeight])
      .padding(0.2);

    disciplineGroup.selectAll("g.bar")
      .data(disciplineData, d => `${region}_${d.sport}`)
      .join("g")
      .attr("class", "bar")
      .attr("transform", d => `translate(0,${yDiscipline(d.displaySport)})`)
      .each(function(d) {
        const g = d3.select(this);
        let offset = 0;
        ["gold", "silver", "bronze"].forEach(key => {
          const value = d[key];
          const width = xDiscipline(value);
          g.append("rect")
            .attr("x", offset)
            .attr("width", width)
            .attr("height", yDiscipline.bandwidth())
            .attr("fill", colors[key]);
          if (width > 15) {
            g.append("text")
              .attr("x", offset + width / 2)
              .attr("y", yDiscipline.bandwidth() / 2)
              .attr("dy", "0.35em")
              .attr("text-anchor", "middle")
              .attr("fill", "black")
              .attr("font-size", "10px")
              .text(value);
          }
          offset += width;
        });
      });

    disciplineGroup.selectAll(".bar-label")
      .data(disciplineData, d => `${region}_${d.sport}`)
      .join("text")
      .attr("class", "bar-label")
      .attr("x", -5)
      .attr("y", d => yDiscipline(d.displaySport) + yDiscipline.bandwidth() / 2)
      .attr("dy", "0.35em")
      .attr("text-anchor", "end")
      .on("mouseover", (event, d) => {
        tooltip
          .style("left", `${event.pageX + 10}px`)
          .style("top", `${event.pageY + 10}px`)
          .classed("hidden", false)
          .html(d.sport);
      })
      .on("mouseout", () => {
        tooltip.classed("hidden", true);
      });

    disciplineGroup.append("g")
      .attr("class", "axis")
      .attr("transform", `translate(0,${disciplineHeight})`)
      .call(d3.axisBottom(xDiscipline).ticks(5).tickFormat(d3.format("d")));

    disciplineGroup.append("g")
      .attr("class", "axis")
      .call(d3.axisLeft(yDiscipline));
  }

  function updateDetails(data, type) {
    if (type === 'country') {
      d3.select('#detailsContainer').html(`
        <strong>${data.country}</strong><br>
        Gold: ${data.gold}<br>
        Silver: ${data.silver}<br>
        Bronze: ${data.bronze}<br>
        Total: ${data.total}
      `);
    } else if (type === 'city') {
      const html = data.length > 0 ? data.map(d => `
        <strong>${d.country}</strong>: ${d.total} (G: ${d.gold}, S: ${d.silver}, B: ${d.bronze})<br>
      `).join('') : 'No data for this city.';
      d3.select('#detailsContainer').html(`
        <strong>${data.city}</strong><br>
        ${html}
      `);
    }
  }

  svg.transition().duration(500).style("opacity", 1);
  barSvg.transition().duration(500).style("opacity", 1);
});