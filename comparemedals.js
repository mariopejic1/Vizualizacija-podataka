d3.csv('athlete_events.csv').then(data => {
    // Filter valid medal entries
    const medalData = data.filter(d => d.Medal === "Gold" || d.Medal === "Silver" || d.Medal === "Bronze");

    // Aggregate medals for each country up to a given year
    function getCumulativeMedalsByYear(year) {
        const yearData = medalData.filter(d => d.Year <= year);
        const countryMedals = {};

        yearData.forEach(d => {
            const country = d.Team; // Use full country name from Team column
            if (!countryMedals[country]) {
                countryMedals[country] = { gold: 0, silver: 0, bronze: 0 };
            }
            if (d.Medal === "Gold") countryMedals[country].gold++;
            if (d.Medal === "Silver") countryMedals[country].silver++;
            if (d.Medal === "Bronze") countryMedals[country].bronze++;
        });

        // Convert to array, calculate total, and sort by total medals
        const countryList = Object.entries(countryMedals)
            .map(([country, medals]) => ({
                country,
                gold: medals.gold,
                silver: medals.silver,
                bronze: medals.bronze,
                total: medals.gold + medals.silver + medals.bronze
            }))
            .sort((a, b) => b.total - a.total || a.country.localeCompare(b.country))
            .slice(0, 10); // Top 10 countries

        return countryList;
    }

    // Set up SVG dimensions
    const margin = { top: 40, right: 40, bottom: 60, left: 200 }; // Increased left margin for country names
    const width = 1000 - margin.left - margin.right; // Increased width
    const height = 500 - margin.top - margin.bottom; // Increased height

    // Use existing SVG from HTML and center it
    const svg = d3.select('#topCountries')
        .attr('width', width + margin.left + margin.right)
        .attr('height', height + margin.top + margin.bottom)
        .style('background', '#fff') // White background
        .style('display', 'block')
        .style('margin', 'auto')
        .append('g')
        .attr('transform', `translate(${margin.left},${margin.top})`);

    // Function to update visualization
    function updateTopCountries(year) {
        const topCountries = getCumulativeMedalsByYear(year);

        // Update scales
        const x = d3.scaleLinear()
            .domain([0, d3.max(topCountries, d => d.total) || 1])
            .range([0, width]);

        const y = d3.scaleBand()
            .domain(topCountries.map(d => d.country))
            .range([0, height])
            .padding(0.1);

        // Update bars
        const bars = svg.selectAll('.country-bar')
            .data(topCountries, d => d.country);

        bars.enter()
            .append('rect')
            .attr('class', 'country-bar')
            .attr('fill', '#1E90FF') // Blue color from CSS
            .attr('y', d => y(d.country))
            .attr('height', y.bandwidth())
            .attr('x', 0)
            .attr('width', 0)
            .merge(bars)
            .transition()
            .duration(1500) // Slower animation
            .ease(d3.easeCubic)
            .attr('y', d => y(d.country))
            .attr('width', d => x(d.total))
            .attr('height', y.bandwidth());

        bars.exit().transition()
            .duration(1500)
            .attr('width', 0)
            .remove();

        // Update country labels on y-axis
        const countryLabels = svg.selectAll('.country-name')
            .data(topCountries, d => d.country);

        countryLabels.enter()
            .append('text')
            .attr('class', 'country-name')
            .attr('x', -10) // Position to the left of bars
            .attr('y', d => y(d.country) + y.bandwidth() / 2)
            .attr('dy', '.35em')
            .attr('text-anchor', 'end') // Right-align text
            .text(d => d.country)
            .merge(countryLabels)
            .transition()
            .duration(1500)
            .ease(d3.easeCubic)
            .attr('y', d => y(d.country) + y.bandwidth() / 2)
            .text(d => d.country);

        countryLabels.exit().remove();

        // Update total medal labels (right of bars)
        const totalLabels = svg.selectAll('.country-label')
            .data(topCountries, d => d.country);

        totalLabels.enter()
            .append('text')
            .attr('class', 'country-label')
            .attr('x', d => x(d.total) + 5)
            .attr('y', d => y(d.country) + y.bandwidth() / 2)
            .attr('dy', '.35em')
            .text(d => d.total)
            .merge(totalLabels)
            .transition()
            .duration(1500)
            .ease(d3.easeCubic)
            .attr('x', d => x(d.total) + 5)
            .attr('y', d => y(d.country) + y.bandwidth() / 2)
            .text(d => d.total);

        totalLabels.exit().remove();

        // Update year label
        d3.select('#yearLabel').text(year);
    }

    // Initialize with 1896
    updateTopCountries(1896);

    // Slider functionality
    const slider = document.getElementById("slider");
    const yearLabel = document.getElementById("yearLabel");

    slider.oninput = function() {
        const year = +slider.value;
        yearLabel.textContent = year;
        updateTopCountries(year);
    };

    // Animation controls
    let animationInterval;
    let currentYear = 1896;

    document.getElementById("startButton").addEventListener("click", () => {
        // Reset to 1896 when starting animation
        currentYear = 1896;
        slider.value = currentYear;
        yearLabel.textContent = currentYear;
        updateTopCountries(currentYear);

        document.getElementById("startButton").disabled = true;
        document.getElementById("stopButton").disabled = false;

        animationInterval = setInterval(() => {
            if (currentYear >= 2016) {
                // Stop animation at 2016 and reset controls
                clearInterval(animationInterval);
                document.getElementById("startButton").disabled = false;
                document.getElementById("stopButton").disabled = true;
            } else {
                currentYear += 4; // Increment by 4 for Olympic years
                slider.value = currentYear;
                yearLabel.textContent = currentYear;
                updateTopCountries(currentYear);
            }
        }, 2000); // Slower transitions (2 seconds)
    });

    document.getElementById("stopButton").addEventListener("click", () => {
        clearInterval(animationInterval);
        document.getElementById("startButton").disabled = false;
        document.getElementById("stopButton").disabled = true;
    });
});