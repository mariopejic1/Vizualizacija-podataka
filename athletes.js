let selectedAthletes = [null, null];
let currentSlotIndex = 0;
let comparisonMode = "year"; // Default comparison mode

const athleteList = d3.select("#athlete-list");
const searchInput = d3.select("#search");
const comparisonModeSelect = d3.select("#comparison-mode");

let allAthletes = [];
let athleteData = [];

function normalizeString(str) {
  return str
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\w\s]/g, "")
    .toLowerCase()
    .trim();
}

function renderList(filter = "") {
  athleteList.selectAll("li").remove();

  if (filter.trim().length === 0) {
    return;
  }

  const normalizedFilterWords = normalizeString(filter).split(/\s+/);

  const filtered = allAthletes.filter(d => {
    const nameWords = normalizeString(d.Name).split(/\s+/);
    return normalizedFilterWords.every(fw =>
      nameWords.some(nw => nw.includes(fw))
    );
  });

  athleteList.selectAll("li")
    .data(filtered)
    .enter()
    .append("li")
    .text(d => d.Name)
    .on("click", function (event, d) {
      selectAthlete(d);
    });
}

function selectSlot(index) {
  currentSlotIndex = index;
  d3.selectAll(".replace-btn").classed("active", false);
  d3.select(`.replace-btn[data-slot='${index}']`).classed("active", true);
}

function selectAthlete(athlete) {
  selectedAthletes[currentSlotIndex] = athlete;
  updateView();
}

d3.selectAll(".replace-btn").on("click", function () {
  const slot = +d3.select(this).attr("data-slot");
  selectSlot(slot);
});

comparisonModeSelect.on("change", function () {
  comparisonMode = this.value;
  updateView();
});

function updateView() {
  selectedAthletes.forEach((athlete, i) => {
    const slot = d3.select(`#slot${i + 1}`);
    const info = slot.select(".athlete-info");
    const charts = {
      year: slot.select(".chart-year"),
      sport: slot.select(".chart-sport"),
      total: slot.select(".chart-total"),
      event: slot.select(".chart-event"),
      timeline: slot.select(".chart-timeline"),
      distribution: slot.select(".chart-distribution"),
      metrics: slot.select(".chart-metrics")
    };

    // Hide all charts
    Object.values(charts).forEach(chart => chart.style("display", "none"));

    if (!athlete) {
      info.html("Nema odabranog sportaša.");
      Object.values(charts).forEach(chart => chart.selectAll("*").remove());
      return;
    }

    const birthYear = athlete.Year - athlete.Age;
    const athleteEvents = athleteData.filter(d => d.ID === athlete.ID);
    const disciplines = Array.from(new Set(athleteEvents.map(d => d.Sport))).join(", ");
    const competitions = Array.from(new Set(athleteEvents.map(d => d.Year))).sort().join(", ");
    const team = athleteEvents.length > 0 ? athleteEvents[0].Team : athlete.NOC;

    info.html(`
      <p><strong>Ime:</strong> ${athlete.Name}</p>   
      <p><strong>Rođenje:</strong> ${birthYear > 1800 ? birthYear : 'Nepoznato'}</p>
      <p><strong>Spol:</strong> ${athlete.Sex}</p>
      <p><strong>Država:</strong> ${team}</p>
      <p><strong>Discipline:</strong> ${disciplines}</p>
      <p><strong>Godine:</strong> ${competitions}</p>
    `);

    const athleteMedals = athleteData.filter(d => d.ID === athlete.ID && d.Medal);

    if (comparisonMode === "year") {
      const groupByYear = d3.rollup(athleteMedals, v => ({
        Gold: v.filter(d => d.Medal === "Gold").length,
        Silver: v.filter(d => d.Medal === "Silver").length,
        Bronze: v.filter(d => d.Medal === "Bronze").length
      }), d => d.Year);

      charts.year.style("display", "block");
      drawStackedBarChart(
        Array.from(groupByYear, ([year, val]) => ({ key: year, ...val })),
        charts.year,
        "Medalje po godinama"
      );
    } else if (comparisonMode === "sport") {
      const groupBySport = d3.rollup(athleteMedals, v => ({
        Gold: v.filter(d => d.Medal === "Gold").length,
        Silver: v.filter(d => d.Medal === "Silver").length,
        Bronze: v.filter(d => d.Medal === "Bronze").length
      }), d => d.Sport);

      charts.sport.style("display", "block");
      drawStackedBarChart(
        Array.from(groupBySport, ([sport, val]) => ({ key: sport, ...val })),
        charts.sport,
        "Medalje po sportovima"
      );
    } else if (comparisonMode === "total") {
      const totalMedals = {
        key: athlete.Name,
        Gold: athleteMedals.filter(d => d.Medal === "Gold").length,
        Silver: athleteMedals.filter(d => d.Medal === "Silver").length,
        Bronze: athleteMedals.filter(d => d.Medal === "Bronze").length
      };

      charts.total.style("display", "block");
      drawStackedBarChart([totalMedals], charts.total, "Ukupne medalje");
    } else if (comparisonMode === "event") {
      const groupByEvent = d3.rollup(athleteMedals, v => ({
        Gold: v.filter(d => d.Medal === "Gold").length,
        Silver: v.filter(d => d.Medal === "Silver").length,
        Bronze: v.filter(d => d.Medal === "Bronze").length
      }), d => d.Event);

      charts.event.style("display", "block");
      drawStackedBarChart(
        Array.from(groupByEvent, ([event, val]) => ({ key: event, ...val })),
        charts.event,
        "Medalje po događajima"
      );
    } else if (comparisonMode === "timeline") {
      const groupByYear = d3.rollup(athleteMedals, v => ({
        Total: v.length
      }), d => d.Year);

      const timelineData = Array.from(groupByYear, ([year, val]) => ({
        year: +year,
        total: val.Total
      })).sort((a, b) => a.year - b.year);

      charts.timeline.style("display", "block");
      drawLineChart(timelineData, charts.timeline, "Vremenska linija medalja");
    } else if (comparisonMode === "distribution") {
      const medalCounts = [
        { type: "Gold", value: athleteMedals.filter(d => d.Medal === "Gold").length },
        { type: "Silver", value: athleteMedals.filter(d => d.Medal === "Silver").length },
        { type: "Bronze", value: athleteMedals.filter(d => d.Medal === "Bronze").length }
      ].filter(d => d.value > 0);

      charts.distribution.style("display", "block");
      drawPieChart(medalCounts, charts.distribution, "Distribucija medalja");
    } else if (comparisonMode === "metrics") {
      const yearsActive = new Set(athleteEvents.map(d => d.Year)).size;
      const uniqueSports = new Set(athleteEvents.map(d => d.Sport)).size;
      const totalEvents = athleteEvents.length;
      const totalMedals = athleteMedals.length;

      const metricsData = [
        { metric: "Godine", value: yearsActive / 10 }, // Normalize
        { metric: "Sportovi", value: uniqueSports / 5 },
        { metric: "Događaji", value: totalEvents / 50 },
        { metric: "Medalje", value: totalMedals / 20 }
      ];

      charts.metrics.style("display", "block");
      drawRadarChart(metricsData, charts.metrics, "Usporedba metrika");
    }
  });
}

function drawStackedBarChart(data, svg, label) {
  svg.selectAll("*").remove();

  const margin = { top: 15, right: 10, bottom: 40, left: 30 };
  const width = parseInt(svg.style("width")) - margin.left - margin.right;
  const height = parseInt(svg.style("height")) - margin.top - margin.bottom;

  const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

  const x = d3.scaleBand()
    .domain(data.map(d => d.key))
    .range([0, width])
    .padding(0.2);

  const y = d3.scaleLinear()
    .domain([0, d3.max(data, d => d.Gold + d.Silver + d.Bronze)])
    .nice()
    .range([height, 0]);

  const color = d3.scaleOrdinal()
    .domain(["Gold", "Silver", "Bronze"])
    .range(["#FFD700", "#C0C0C0", "#CD7F32"]);

  const stack = d3.stack()
    .keys(["Gold", "Silver", "Bronze"]);

  const stackedData = stack(data);

  const layers = g.selectAll("g.layer")
    .data(stackedData)
    .enter()
    .append("g")
    .attr("class", "layer")
    .attr("fill", d => color(d.key));

  layers.selectAll("rect")
    .data(d => d)
    .enter()
    .append("rect")
    .attr("x", d => x(d.data.key))
    .attr("y", d => y(d[1]))
    .attr("height", d => y(d[0]) - y(d[1]))
    .attr("width", x.bandwidth());

  layers.selectAll("text")
    .data(d => d)
    .enter()
    .append("text")
    .text(d => {
      const val = d[1] - d[0];
      return val > 0 ? val : "";
    })
    .attr("x", d => x(d.data.key) + x.bandwidth() / 2)
    .attr("y", d => y(d[1]) + (y(d[0]) - y(d[1])) / 2 + 3)
    .attr("text-anchor", "middle")
    .attr("fill", "black")
    .style("font-size", "9px");

  g.append("g")
    .attr("class", "y-axis")
    .call(d3.axisLeft(y).ticks(3))
    .selectAll("text")
    .style("font-size", "8px");

  g.append("g")
    .attr("class", "x-axis")
    .attr("transform", `translate(0,${height})`)
    .call(d3.axisBottom(x))
    .selectAll("text")
    .attr("transform", "rotate(0)")
    .style("text-anchor", "middle")
    .style("font-size", "8px");

  g.append("text")
    .attr("x", width / 2)
    .attr("y", height + 30)
    .attr("text-anchor", "middle")
    .style("font-size", "10px")
    .style("font-weight", "bold")
    .text(label);
}

function drawLineChart(data, svg, label) {
  svg.selectAll("*").remove();

  const margin = { top: 15, right: 10, bottom: 40, left: 30 };
  const width = parseInt(svg.style("width")) - margin.left - margin.right;
  const height = parseInt(svg.style("height")) - margin.top - margin.bottom;

  const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

  const x = d3.scaleLinear()
    .domain(d3.extent(data, d => d.year))
    .range([0, width]);

  const y = d3.scaleLinear()
    .domain([0, d3.max(data, d => d.total)])
    .nice()
    .range([height, 0]);

  const line = d3.line()
    .x(d => x(d.year))
    .y(d => y(d.total));

  g.append("path")
    .datum(data)
    .attr("fill", "none")
    .attr("stroke", "#2563eb")
    .attr("stroke-width", 2)
    .attr("d", line);

  g.append("g")
    .attr("class", "y-axis")
    .call(d3.axisLeft(y).ticks(3))
    .selectAll("text")
    .style("font-size", "8px");

  g.append("g")
    .attr("class", "x-axis")
    .attr("transform", `translate(0,${height})`)
    .call(d3.axisBottom(x).tickFormat(d3.format("d")))
    .selectAll("text")
    .style("font-size", "8px");

  g.append("text")
    .attr("x", width / 2)
    .attr("y", height + 30)
    .attr("text-anchor", "middle")
    .style("font-size", "10px")
    .style("font-weight", "bold")
    .text(label);
}

function drawPieChart(data, svg, label) {
  svg.selectAll("*").remove();

  const width = parseInt(svg.style("width"));
  const height = parseInt(svg.style("height"));
  const radius = Math.min(width, height) / 2 - 20;

  const g = svg.append("g")
    .attr("transform", `translate(${width / 2},${height / 2})`);

  const color = d3.scaleOrdinal()
    .domain(data.map(d => d.type))
    .range(["#FFD700", "#C0C0C0", "#CD7F32"]);

  const pie = d3.pie()
    .value(d => d.value)
    .sort(null);

  const arc = d3.arc()
    .innerRadius(0)
    .outerRadius(radius);

  const arcs = g.selectAll(".arc")
    .data(pie(data))
    .enter()
    .append("g")
    .attr("class", "arc");

  arcs.append("path")
    .attr("d", arc)
    .attr("fill", d => color(d.data.type));

  arcs.append("text")
    .attr("transform", d => `translate(${arc.centroid(d)})`)
    .attr("text-anchor", "middle")
    .text(d => d.data.value)
    .style("font-size", "9px")
    .style("fill", "black");

  g.append("text")
    .attr("x", 0)
    .attr("y", radius + 15)
    .attr("text-anchor", "middle")
    .style("font-size", "10px")
    .style("font-weight", "bold")
    .text(label);
}

function drawRadarChart(data, svg, label) {
  svg.selectAll("*").remove();

  const width = parseInt(svg.style("width"));
  const height = parseInt(svg.style("height"));
  const radius = Math.min(width, height) / 2 - 30;

  const g = svg.append("g")
    .attr("transform", `translate(${width / 2},${height / 2})`);

  const angleSlice = Math.PI * 2 / data.length;

  const rScale = d3.scaleLinear()
    .domain([0, 1])
    .range([0, radius]);

  // Draw axes
  data.forEach((d, i) => {
    const angle = i * angleSlice - Math.PI / 2;
    g.append("line")
      .attr("x1", 0)
      .attr("y1", 0)
      .attr("x2", Math.cos(angle) * radius)
      .attr("y2", Math.sin(angle) * radius)
      .attr("stroke", "#94a3b8")
      .attr("stroke-width", 1);

    g.append("text")
      .attr("x", Math.cos(angle) * (radius + 10))
      .attr("y", Math.sin(angle) * (radius + 10))
      .attr("text-anchor", i % 2 === 0 ? "middle" : "start")
      .text(d.metric)
      .style("font-size", "8px");
  });

  // Draw data polygon
  const radarLine = d3.lineRadial()
    .radius(d => rScale(d.value))
    .angle((d, i) => i * angleSlice);

  g.append("path")
    .datum(data)
    .attr("fill", "#2563eb")
    .attr("fill-opacity", 0.3)
    .attr("stroke", "#2563eb")
    .attr("stroke-width", 2)
    .attr("d", radarLine);

  g.append("text")
    .attr("x", 0)
    .attr("y", radius + 15)
    .attr("text-anchor", "middle")
    .style("font-size", "10px")
    .style("font-weight", "bold")
    .text(label);
}

searchInput.on("input", function () {
  renderList(this.value);
});

d3.csv("athlete_events.csv").then(data => {
  athleteData = data;
  allAthletes = Array.from(d3.group(data, d => d.ID), ([id, records]) => records[0]);
  renderList();
  selectSlot(0);
});