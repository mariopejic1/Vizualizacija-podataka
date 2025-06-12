// izvlačenje podataka o sprtašima poradi dobivanja ukupnog broja medlja za pojedine države
d3.csv('athlete_events.csv').then(data => {
    const medalData = data.filter(d => d.Medal === "Gold" || d.Medal === "Silver" || d.Medal === "Bronze");

    function getCumulativeMedalsByYear(year) {
        const yearData = medalData.filter(d => +d.Year <= year);
        const countryMedals = {};

        yearData.forEach(d => {
            const country = d.Team;
            if (!countryMedals[country]) {
                countryMedals[country] = { gold: 0, silver: 0, bronze: 0 };
            }
            if (d.Medal === "Gold") countryMedals[country].gold++;
            if (d.Medal === "Silver") countryMedals[country].silver++;
            if (d.Medal === "Bronze") countryMedals[country].bronze++;
        });

        return Object.entries(countryMedals)
            .map(([country, medals]) => ({
                country,
                gold: medals.gold,
                silver: medals.silver,
                bronze: medals.bronze,
                total: medals.gold + medals.silver + medals.bronze
            }))
            .sort((a, b) => b.total - a.total || a.country.localeCompare(b.country))
            .slice(0, 10);
    }

    const margin = { top: 40, right: 40, bottom: 60, left: 250 };
    const width = 1100 - margin.left - margin.right;
    const height = 500 - margin.top - margin.bottom;

    const svg = d3.select('#topCountries')
        .attr('width', width + margin.left + margin.right)
        .attr('height', height + margin.top + margin.bottom)
        .append('g')
        .attr('transform', `translate(${margin.left},${margin.top})`);

    function updateTopCountries(year) {
        const topCountries = getCumulativeMedalsByYear(year);

        const x = d3.scaleLinear()
            .domain([0, d3.max(topCountries, d => d.total) || 1])
            .range([0, width]);

        const y = d3.scaleBand()
            .domain(topCountries.map(d => d.country))
            .range([0, height])
            .padding(0.1);

        const bars = svg.selectAll('.country-bar')
            .data(topCountries, d => d.country);

        bars.enter()
            .append('rect')
            .attr('class', 'country-bar')
            .attr('y', d => y(d.country))
            .attr('height', y.bandwidth())
            .attr('x', 0)
            .attr('width', 0)
            .merge(bars)
            .transition()
            .duration(1500)
            .ease(d3.easeCubic)
            .attr('y', d => y(d.country))
            .attr('width', d => x(d.total))
            .attr('height', y.bandwidth());

        bars.exit().transition()
            .duration(1500)
            .attr('width', 0)
            .remove();

        const countryLabels = svg.selectAll('.country-name')
            .data(topCountries, d => d.country);

        countryLabels.enter()
            .append('text')
            .attr('class', 'country-name')
            .attr('x', -10)
            .attr('y', d => y(d.country) + y.bandwidth() / 2)
            .attr('dy', '.30em')
            .text(d => d.country)
            .merge(countryLabels)
            .transition()
            .duration(1500)
            .ease(d3.easeCubic)
            .attr('y', d => y(d.country) + y.bandwidth() / 2)
            .text(d => d.country);

        countryLabels.exit().remove();

        const totalLabels = svg.selectAll('.country-label')
            .data(topCountries, d => d.country);

        totalLabels.enter()
            .append('text')
            .attr('class', 'country-label')
            .attr('x', d => x(d.total) + 5)
            .attr('y', d => y(d.country) + y.bandwidth() / 2)
            .attr('dy', '.30em')
            .text(d => d.total)
            .merge(totalLabels)
            .transition()
            .duration(1500)
            .ease(d3.easeCubic)
            .attr('x', d => x(d.total) + 5)
            .attr('y', d => y(d.country) + y.bandwidth() / 2)
            .text(d => d.total);

        totalLabels.exit().remove();

        d3.select('#yearLabel').text(year);
    }

    updateTopCountries(1896);

    const slider = document.getElementById("slider");
    const yearLabel = document.getElementById("yearLabel");

    slider.oninput = function() {
        const year = +this.value;
        yearLabel.textContent = year;
        updateTopCountries(year);
    };

    let animationInterval;

    document.getElementById("startButton").addEventListener("click", () => {
        const startYear = +slider.value;

        let currentYear = startYear;
        if (currentYear === 2016 && document.getElementById("stopButton").disabled) {
            currentYear = 1896;
            slider.value = currentYear;
            yearLabel.textContent = currentYear;
            updateTopCountries(currentYear);
        }

        document.getElementById("startButton").disabled = true;
        document.getElementById("stopButton").disabled = false;

        animationInterval = setInterval(() => {
            currentYear = +slider.value;

            if (currentYear >= 2016) {
                clearInterval(animationInterval);
                slider.value = 2016;
                yearLabel.textContent = 2016;
                document.getElementById("startButton").disabled = false;
                document.getElementById("stopButton").disabled = true;
            } else {
                currentYear += 4;
                slider.value = currentYear;
                yearLabel.textContent = currentYear;
                updateTopCountries(currentYear);
            }
        }, 2000);
    });

    document.getElementById("stopButton").addEventListener("click", () => {
        clearInterval(animationInterval);
        document.getElementById("startButton").disabled = false;
        document.getElementById("stopButton").disabled = true;
        const year = +slider.value;
    });
});