let selectedAthletes = [null, null];

const athleteList = d3.select("#athlete-list");
const searchInput = d3.select("#search");

let allAthletes = [];

function renderList(filter = "") {
  athleteList.selectAll("li").remove();

  const filtered = allAthletes.filter(d => d.Name.toLowerCase().includes(filter.toLowerCase()));

  athleteList.selectAll("li")
    .data(filtered)
    .enter()
    .append("li")
    .text(d => d.Name)
    .on("click", function (event, d) {
      selectAthlete(d);
    });
}

function selectAthlete(athlete) {
  // Pronađi koji slot je prazan ili zamijeni prvog
  const index = selectedAthletes[0] === null ? 0 : (selectedAthletes[1] === null ? 1 : 0);
  selectedAthletes[index] = athlete;
  updateView();
}

function updateView() {
  selectedAthletes.forEach((athlete, i) => {
    const slot = d3.select(`#slot${i + 1}`);
    if (athlete) {
      slot.select(".athlete-info").html(`
        <p><strong>Ime:</strong> ${athlete.Name}</p>
        <p><strong>Spol:</strong> ${athlete.Sex}</p>
        <p><strong>Godina rođenja:</strong> ${athlete.Year - athlete.Age}</p>
        <p><strong>NOC:</strong> ${athlete.NOC}</p>
      `);

      const athleteMedals = athleteData.filter(d => d.ID === athlete.ID && d.Medal);

      const byYear = d3.group(athleteMedals, d => d.Year);
      const bySport = d3.group(athleteMedals, d => d.Sport);

      let yearHTML = `<h4>Medalje po godinama:</h4>`;
      for (const [year, events] of byYear) {
        const counts = { Gold: 0, Silver: 0, Bronze: 0 };
        events.forEach(d => counts[d.Medal]++);
        yearHTML += `<p>${year}: 🥇 ${counts.Gold}, 🥈 ${counts.Silver}, 🥉 ${counts.Bronze}</p>`;
      }

      let sportHTML = `<h4>Medalje po sportovima:</h4>`;
      for (const [sport, events] of bySport) {
        const counts = { Gold: 0, Silver: 0, Bronze: 0 };
        events.forEach(d => counts[d.Medal]++);
        sportHTML += `<p>${sport}: 🥇 ${counts.Gold}, 🥈 ${counts.Silver}, 🥉 ${counts.Bronze}</p>`;
      }

      slot.select(".medal-info").html(yearHTML + sportHTML);
    } else {
      slot.select(".athlete-info").html("");
      slot.select(".medal-info").html("");
    }
  });
}

searchInput.on("input", function () {
  renderList(this.value);
});

let athleteData = [];

d3.csv("athlete_events.csv").then(data => {
  athleteData = data;
  allAthletes = Array.from(d3.group(data, d => d.ID), ([id, records]) => records[0]);
  renderList();
});
