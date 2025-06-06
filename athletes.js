let selectedAthletes = [null, null];
let currentSlotIndex = 0;

const athleteList = d3.select("#athlete-list");
const searchInput = d3.select("#search");

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

function updateView() {
  selectedAthletes.forEach((athlete, i) => {
    const slot = d3.select(`#slot${i + 1}`);
    const info = slot.select(".athlete-info");
    const medals = slot.select(".medal-info");
    const chartYear = slot.select(".chart-year");
    const chartSport = slot.select(".chart-sport");

    if (!athlete) {
      info.html("Nema odabranog sportaša.");
      medals.html("");
      chartYear.selectAll("*").remove();
      chartSport.selectAll("*").remove();
      return;
    }

    const birthYear = athlete.Year - athlete.Age;

    const athleteEvents = athleteData.filter(d => d.ID === athlete.ID);
    const disciplines = Array.from(new Set(athleteEvents.map(d => d.Sport))).join(", ");
    const competitions = Array.from(new Set(athleteEvents.map(d => d.Year))).sort().join(", ");

    const team = athleteEvents.length > 0 ? athleteEvents[0].Team : athlete.NOC;

    info.html(`
      <p><strong>Ime i prezime:</strong> ${athlete.Name}</p>   
      <p><strong>Godina rođenja:</strong> ${birthYear > 1800 ? birthYear : 'Nepoznata'}</p>
      <p><strong>Spol:</strong> ${athlete.Sex}</p>
      <p><strong>Država (Team):</strong> ${team}</p>
      <p><strong>Discipline:</strong> ${disciplines}</p>
      <p><strong>Natjecanja (godine):</strong> ${competitions}</p>
    `);

    const athleteMedals = athleteData.filter(d => d.ID === athlete.ID && d.Medal);

    const groupByYear = d3.rollup(athleteMedals, v => ({
      Gold: v.filter(d => d.Medal === "Gold").length,
      Silver: v.filter(d => d.Medal === "Silver").length,
      Bronze: v.filter(d => d.Medal === "Bronze").length
    }), d => d.Year);

    const groupBySport = d3.rollup(athleteMedals, v => ({
      Gold: v.filter(d => d.Medal === "Gold").length,
      Silver: v.filter(d => d.Medal === "Silver").length,
      Bronze: v.filter(d => d.Medal === "Bronze").length
    }), d => d.Sport);

    medals.html("");

    drawStackedBarChart(Array.from(groupByYear, ([year, val]) => ({ key: year, ...val })), chartYear, "Medalje po godinama");
    drawStackedBarChart(Array.from(groupBySport, ([sport, val]) => ({ key: sport, ...val })), chartSport, "Medalje po sportovima");
  });
}

function drawStackedBarChart(data, svg, label) {
  svg.selectAll("*").remove();

  const margin = { top: 20, right: 20, bottom: 60, left: 50 };
  const width = parseInt(svg.style("width")) - margin.left - margin.right;
  const height = parseInt(svg.style("height")) - margin.top - margin.bottom;

  const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

  const x = d3.scaleBand()
    .domain(data.map(d => d.key))
    .range([0, width])
    .padding(0.3);

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
  .attr("y", d => y(d[1]) + (y(d[0]) - y(d[1])) / 2 + 4)  
  .attr("text-anchor", "middle")
  .attr("fill", "black")
  .style("font-size", "11px");

  g.append("g")
    .attr("class", "y-axis")
    .call(d3.axisLeft(y).ticks(5));

  g.append("g")
    .attr("class", "x-axis")
    .attr("transform", `translate(0,${height})`)
    .call(d3.axisBottom(x))
    .selectAll("text")
    .attr("transform", "rotate(0)")
    .style("text-anchor", "middle");

  g.append("text")
    .attr("x", width / 2)
    .attr("y", height + 45)
    .attr("text-anchor", "middle")
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
