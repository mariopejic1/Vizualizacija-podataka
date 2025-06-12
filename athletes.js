let selectedAthletes = [null, null];
let currentSlotIndex = 0;
let comparisonMode = "year";

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
      total: slot.select(".chart-total"),
      event: slot.select(".chart-event")
    };

    Object.values(charts).forEach(chart => chart.style("display", "none"));

    if (!athlete) {
      info.html("Athlete not found.");
      Object.values(charts).forEach(chart => chart.selectAll("*").remove());
      return;
    }

    const birthYear = athlete.Year - athlete.Age;
    const athleteEvents = athleteData.filter(d => d.ID === athlete.ID);
    const sports = Array.from(new Set(athleteEvents.map(d => d.Sport))).join(", ");
    const allEvents = Array.from(new Set(athleteEvents.map(d => d.Event))).join(", ");
    const competitions = Array.from(new Set(athleteEvents.map(d => d.Year))).sort().join(", ");
    const team = athleteEvents.length > 0 ? athleteEvents[0].Team : athlete.NOC;

    info.html(`
      <div class="athlete-info-content">
        <p><strong>Name:</strong> ${athlete.Name}</p>
        <p><strong>Born:</strong> ${birthYear > 1800 ? birthYear : 'Unknown'}</p>
        <p><strong>Sex:</strong> ${athlete.Sex}</p>
        <p><strong>Country:</strong> ${team}</p>
        <p><strong>Sport:</strong> ${sports}</p>
        <p><strong>Years of Competing:</strong> ${competitions}</p>
        <p><strong>Disciplines:</strong> <span>${allEvents}</span></p>
      </div>
    `);

    const athleteMedals = athleteData.filter(d => d.ID === athlete.ID && d.Medal && d.Medal !== "NA");

    if (comparisonMode === "year") {
      const groupByYear = d3.rollup(athleteEvents, v => ({
        Gold: v.filter(d => d.Medal === "Gold").length,
        Silver: v.filter(d => d.Medal === "Silver").length,
        Bronze: v.filter(d => d.Medal === "Bronze").length
      }), d => d.Year);

      const yearData = Array.from(groupByYear, ([year, val]) => ({ key: year, ...val }));
      charts.year.style("display", "block");
      drawStackedBarChart(yearData, charts.year, "Medals by Olympic games");
    } else if (comparisonMode === "total") {
      const totalMedals = {
        Gold: athleteMedals.filter(d => d.Medal === "Gold").length,
        Silver: athleteMedals.filter(d => d.Medal === "Silver").length,
        Bronze: athleteMedals.filter(d => d.Medal === "Bronze").length
      };

      charts.total.style("display", "block");
      drawTotalBarChart(totalMedals, charts.total, "Total medals");
    } else if (comparisonMode === "event") {
      const groupByEvent = d3.rollup(athleteMedals, v => ({
        Gold: v.filter(d => d.Medal === "Gold").length,
        Silver: v.filter(d => d.Medal === "Silver").length,
        Bronze: v.filter(d => d.Medal === "Bronze").length
      }), d => d.Event);

      const eventData = Array.from(groupByEvent, ([event, val]) => ({
        event: event,
        Gold: val.Gold,
        Silver: val.Silver,
        Bronze: val.Bronze,
        total: val.Gold + val.Silver + val.Bronze
      })).filter(d => d.total > 0);

      charts.event.style("display", "block");
      drawEventBarChart(eventData, charts.event, "Medals by disciplines");
    }
  });
}

function drawStackedBarChart(data, svg, label) {
  svg.selectAll("*").remove();

  const margin = { top: 40, right: 20, bottom: 50, left: 40 };
  const width = parseInt(svg.style("width")) - margin.left - margin.right;
  const height = parseInt(svg.style("height")) - margin.top - margin.bottom;

  const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

  const x = d3.scaleBand()
    .domain(data.map(d => d.key))
    .range([0, width])
    .padding(data.length > 10 ? 0.1 : 0.2);

  const y = d3.scaleLinear()
    .domain([0, d3.max(data, d => d.Gold + d.Silver + d.Bronze) || 1])
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
    .style("font-size", data.length > 10 ? "7px" : "9px");

  g.append("g")
    .attr("class", "y-axis")
    .call(d3.axisLeft(y).ticks(3))
    .selectAll("text")
    .style("font-size", data.length > 10 ? "7px" : "8px");

  g.append("g")
    .attr("class", "x-axis")
    .attr("transform", `translate(0,${height})`)
    .call(d3.axisBottom(x))
    .selectAll("text")
    .attr("transform", "rotate(-45)")
    .style("text-anchor", "end")
    .style("font-size", data.length > 10 ? "7px" : "8px");

  g.append("text")
    .attr("x", width / 2)
    .attr("y", -20)
    .attr("text-anchor", "middle")
    .style("font-family", "'Inter', sans-serif")
    .style("font-size", "10px")
    .style("font-weight", "bold")
    .text(label);
}

function drawTotalBarChart(data, svg, label) {
  svg.selectAll("*").remove();

  const margin = { top: 40, right: 20, bottom: 50, left: 40 };
  const width = parseInt(svg.style("width")) - margin.left - margin.right;
  const height = parseInt(svg.style("height")) - margin.top - margin.bottom;

  const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

  const medals = [
    { type: "Gold", value: data.Gold },
    { type: "Silver", value: data.Silver },
    { type: "Bronze", value: data.Bronze }
  ].filter(d => d.value > 0);

  const x = d3.scaleBand()
    .domain(medals.map(d => d.type))
    .range([0, width])
    .padding(0.2);

  const y = d3.scaleLinear()
    .domain([0, d3.max(medals, d => d.value) || 1])
    .nice()
    .range([height, 0]);

  const color = d3.scaleOrdinal()
    .domain(["Gold", "Silver", "Bronze"])
    .range(["#FFD700", "#C0C0C0", "#CD7F32"]);

  g.selectAll("rect")
    .data(medals)
    .enter()
    .append("rect")
    .attr("x", d => x(d.type))
    .attr("y", d => y(d.value))
    .attr("width", x.bandwidth())
    .attr("height", d => height - y(d.value))
    .attr("fill", d => color(d.type));

  g.selectAll("text.value")
    .data(medals)
    .enter()
    .append("text")
    .attr("class", "value")
    .text(d => d.value > 0 ? d.value : "")
    .attr("x", d => x(d.type) + x.bandwidth() / 2)
    .attr("y", d => y(d.value) - 5)
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
    .style("font-size", "8px");

  g.append("text")
    .attr("x", width / 2)
    .attr("y", -20)
    .attr("text-anchor", "middle")
    .style("font-family", "'Inter', sans-serif")
    .style("font-size", "10px")
    .style("font-weight", "bold")
    .text(label);
}

function drawEventBarChart(data, svg, label) {
  svg.selectAll("*").remove();

  const margin = { top: 40, right: 20, bottom: 30, left: 180 };
  const width = parseInt(svg.style("width")) - margin.left - margin.right;
  const height = parseInt(svg.style("height")) - margin.top - margin.bottom;

  const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

  const y = d3.scaleBand()
    .domain(data.map(d => d.event))
    .range([0, height])
    .padding(data.length > 10 ? 0.1 : 0.2);

  const x = d3.scaleLinear()
    .domain([0, d3.max(data, d => d.Gold + d.Silver + d.Bronze) || 1])
    .nice()
    .range([0, width]);

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
    .attr("y", d => y(d.data.event))
    .attr("x", d => x(d[0]))
    .attr("width", d => x(d[1]) - x(d[0]))
    .attr("height", y.bandwidth());

  layers.selectAll("text")
    .data(d => d)
    .enter()
    .append("text")
    .text(d => {
      const val = d[1] - d[0];
      return val > 0 ? val : "";
    })
    .attr("y", d => y(d.data.event) + y.bandwidth() / 2 + 3)
    .attr("x", d => x(d[0]) + (x(d[1]) - x(d[0])) / 2)
    .attr("text-anchor", "middle")
    .attr("fill", "black")
    .style("font-size", data.length > 10 ? "7px" : "9px");

  g.append("g")
    .attr("class", "y-axis")
    .call(d3.axisLeft(y))
    .selectAll("text")
    .style("font-size", data.length > 10 ? "7px" : "8px");

  g.append("g")
    .attr("class", "x-axis")
    .attr("transform", `translate(0,${height})`)
    .call(d3.axisBottom(x).ticks(3))
    .selectAll("text")
    .style("font-size", "8px");

  g.append("text")
    .attr("x", width / 2)
    .attr("y", -20)
    .attr("text-anchor", "middle")
    .style("font-family", "'Inter', sans-serif")
    .style("font-size", "10px")
    .style("font-weight", "bold")
    .text(label);
}

searchInput.on("input", function () {
  renderList(this.value);
});

//Izvlačenje podataka o sportašima kako bi ih se moglo pretražiti, dobiti podtake o istima i usporediti
d3.csv("athlete_events.csv").then(data => {
  athleteData = data;
  allAthletes = Array.from(d3.group(data, d => d.ID), ([id, records]) => records[0]);
  renderList();
  selectSlot(0);
});