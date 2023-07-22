"use strict"

import "https://d3js.org/d3.v7.min.js";
import * as storyContent from "./storyContent.js";

// Declare global variables and set static values
let canvas = null;
let storyContainer = null;
let navigation = null;
const scene = {};
const datasets = {};
const charts = {};
const canvasWidth = 1000;
const canvasHeight = 800;
const sceneTransitionTime = 500;
const chartTransitionTime = 2000;
const dateParser = d3.utcParse("%Y-%m-%d");

// Execute the narrative visualization
init();

// Initialize the narrative visualization
function init() {
    // Store the canvas selection, story container, and navigation controls into variables
    canvas = d3.select("#canvas");
    storyContainer = document.getElementById("story");
    navigation = document.getElementsByTagName("nav")[0]
        .getElementsByTagName("ul")[0];

    // Create the scene states
    // Any function may observe the sceneState variable, but only loadScene() may modify it
    scene.previous = 0;
    scene.current = 0;
    scene.viewed = storyContent.scenes.map(a => false);
    scene.loader = [null, loadScene1, loadScene2, loadScene3, loadScene4, loadScene5];

    // Create the chart specifications
    charts.pie = {
        chart : null,
        height: canvasHeight,
        width: canvasWidth,
        x : (canvasWidth / 2),
        y : (canvasHeight / 2),
        innerRadius: 150,
        outerRadius: 275,
        markSize : 50
    };

    charts.line = {
        chart : null,
        width : canvasWidth,
        height : canvasHeight,
        x : 0,
        y : 0,
        marginBottom : 50,
        marginLeft : 70,
        marginRight : 20,
        marginTop : 50
    }

    // Set the canvas's dimensions
    canvas.attr("width", canvasWidth)
        .attr("height", canvasHeight);

    // Start the narrative visualization by loading the first scene
    loadScene(1);
}

// Load the specified scene
function loadScene(sceneNumber) {
    // Set the new scene as having been viewed
    scene.previous = scene.current;
    scene.current = sceneNumber;
    scene.firstView = !scene.viewed[scene.current];
    scene.viewed[scene.current] = true;
    
    // Update the navigation bar
    updateNavigationBar();

    // Load the story text
    const nodes = []

    let currentNode = document.createElement("h2");
    currentNode.innerHTML = storyContent.scenes[scene.current].title;
    nodes.push(currentNode);

    for(const paragraph of storyContent.scenes[scene.current].body) {
        currentNode = document.createElement("p")
        currentNode.innerHTML = paragraph;
        nodes.push(currentNode);
    }

    storyContainer.replaceChildren(...nodes);

    // Load the scene
    scene.loader[scene.current]();
}

// Update the navigation bar
function updateNavigationBar() {
    // Create an array to store the newly created nodes
    const nodes = [];

    // Add the "back" button
    let currentNode = document.createElement("li");
    currentNode.textContent = "◀";
    
    if(scene.current > 1) {
        currentNode.classList.add("enabled");
        currentNode.title = "Go back";
        currentNode.addEventListener("click", e => loadScene((scene.current - 1)));

    } else {
        currentNode.classList.add("disabled");
    }
    
    nodes.push(currentNode);

    // Add the scene selection buttons
    for(let i = 1; i < storyContent.scenes.length; ++i) {
        let currentNode = document.createElement("li");
        currentNode.textContent = i;
        
        if(i == scene.current) {
            currentNode.classList.add("current");
            currentNode.addEventListener("click", e => loadScene(i));

        } else if(scene.viewed[i]) {
            currentNode.classList.add("enabled");
            currentNode.addEventListener("click", e => loadScene(i));

        } else {
            currentNode.classList.add("disabled");
        }

        nodes.push(currentNode);
    }

    // Add the "forward" button
    currentNode = document.createElement("li");
    currentNode.textContent = "▶";

    if(scene.current < scene.viewed.length - 1) {
        currentNode.classList.add("enabled");
        currentNode.title = "Go forward";
        currentNode.addEventListener("click", e => loadScene((scene.current + 1)));

    } else {
        currentNode.classList.add("disabled");
    }

    nodes.push(currentNode);

    // Replace the old nav bar with the new nav bar
    navigation.replaceChildren(...nodes);
}

// Load scene 1
function loadScene1() {
    // Load the required dataset if it has not yet been loaded
    if(datasets.popularRetailEquitiesEarly2023 === undefined) {
        d3.csv("./data/popular-retail-equities-early-2023.csv")
            .then(dataset => {
                datasets.popularRetailEquitiesEarly2023 = dataset;
                renderScene1Canvas();
            });
    
    } else {
        renderScene1Canvas();
    }
}

// Render scene 1's visualization onto the canvas
function renderScene1Canvas() {
    // Get the loaded dataset
    const dataset = datasets.popularRetailEquitiesEarly2023;
    const data = dataset.map(a => parseInt(a.RetailNetFlowMillions));

    // Clear the canvas
    document.getElementById("canvas").replaceChildren();

    // Declare the chart and its attributes
    const chart = {
        chart : null,
        height: canvasHeight,
        width: canvasWidth,
        x : (canvasWidth / 2),
        y : (canvasHeight / 2),
        innerRadius: 150,
        outerRadius: 275,
        markSize : 50
    };    

    // Create the chart element and set its dimensions and position
    chart.chart = canvas.append("g")
        .attr("height", chart.height)
        .attr("width", chart.width)
        .attr("transform", `translate(${chart.x},${chart.y})`);

    // Create the chart title
    chart.chart.append("text")
        .text("Retail Investors' Top 10 Picks for Early 2023")
        .attr("class", "chart-title")
        .attr("text-anchor", "middle")
        .attr("transform", `translate(${chartTitleCenter(chart) - chart.x},${50 - chart.y})`);

    // Create the pie and arc generators
    const pie = d3.pie();
    const arc = d3.arc()
        .innerRadius(chart.innerRadius)
        .outerRadius(chart.outerRadius);

    // Create the pie chart and its entrance transition
    chart.chart.selectAll("path")
        .data(pie(data))
        .enter()
        .append("path")
        .attr("fill", (d, i) => color(i))
        .transition()
        .duration(chartTransitionTime)
        .attrTween("d", d => {
            const originalEnd = d.endAngle;
            const angleInterpolation = d3.interpolate(pie.startAngle()(), pie.endAngle()());

            return t => {
                const currentAngle = angleInterpolation(t);

                if(currentAngle < d.startAngle) {
                    return "";
                }

                d.endAngle = Math.min(currentAngle, originalEnd);
                return arc(d);
            };
        });

    // Create the pie chart wedge icons and their entrance transition
    chart.chart.selectAll("image")
        .data(pie(data))
        .enter()
        .append("image")
        .attr("opacity", 0.0)
        .attr("href", (d, i) => `./images/${dataset[i].LogoFile}`)
        .attr("width", chart.markSize)
        .attr("height", chart.markSize)
        .attr("transform", d => `translate(${arc.centroid(d)[0] - (chart.markSize / 2)},${arc.centroid(d)[1] - (chart.markSize / 2)})`)
        .transition()
        .delay(chartTransitionTime * 0.85)
        .duration(500)
        .attr("opacity", 1.0);

    // Create the sum counter
    chart.chart.datum(data.reduce((accumulator, currentValue) => (accumulator + currentValue), 0))
        .append("text")
        .attr("fill", "black")
        .attr("text-anchor", "middle")
        .attr("class", "chart-focus-text")
        .transition()
        .duration(chartTransitionTime)
        .tween("text-focus", function(d) {
            const textInterpolation = d3.interpolate(0, d);
            const formatterNumberThousands = d3.format(",");
    
            return t => {
                this.textContent = `$${formatterNumberThousands(Math.round(textInterpolation(t)))}M`;
            };
        });
}

// Load scene 2
function loadScene2() {
    // Load the required dataset if it has not yet been loaded
    if(datasets.spxHistorical === undefined) {
        d3.csv("./data/spx-historical.csv")
            .then(dataset => {
                datasets.spxHistorical = dataset;
                renderScene2Canvas();
            });
    
    } else {
        renderScene2Canvas();
    }
}

// Render scene 2's visualization onto the canvas
function renderScene2Canvas() {
    // Clear the canvas
    document.getElementById("canvas").replaceChildren();

    // Get the loaded dataset
    const dataset = datasets.spxHistorical;

    // Declare the chart and its attributes
    const chart = charts.line;

    // Create the dataset subset
    const dateRangeEnd = new Date("2002-09-28");
    const datasetPreDotComBurst = dataset.filter(d => (dateParser(d.Date) <= dateRangeEnd));

    // Create the chart (initially invisible)
    chart.chart = canvas.append("g")
        .attr("height", chart.height)
        .attr("width", chart.width)
        .attr("transform", `translate(${chart.x},${chart.y})`)
        .attr("opacity", "0.0");

    // Create the chart title
    chart.chart.append("text")
        .text("S&P 500 (2000-2002)")
        .attr("class", "chart-title")
        .attr("id", "chart-title")
        .attr("text-anchor", "middle")
        .attr("transform", `translate(${chartTitleCenter(chart)},${chart.marginTop})`);

    // Create the x scale
    const x = d3.scaleTime()
        .domain(d3.extent(datasetPreDotComBurst, d => dateParser(d.Date)))
        .range([chart.marginLeft, (chart.width - chart.marginRight)]);

    // Create the y scale
    const y = d3.scaleLinear()
        .domain([600, 1600])
        .range([(chart.height - chart.marginBottom), chart.marginTop]);

    // Create the x axis
    chart.chart.append("g")
        .attr("id", "chart-axis-x")
        .attr("transform", `translate(0,${chart.height - chart.marginBottom})`)
        .call(d3.axisBottom(x))
        // Create the axis label
        .append("text")
        .text("Date")
        .attr("class", "chart-axis-label")
        .attr("fill", "black")
        .attr("text-anchor", "middle")
        .attr("transform", `translate(${chartAxisXCenter(chart)},35)`);

    // Create the y axis
    chart.chart.append("g")
        .attr("id", "chart-axis-y")
        .attr("transform", `translate(${chart.marginLeft},0)`)
        .call(d3.axisLeft(y))
        // Create the axis label
        .append("text")
        .text("Value")
        .attr("class", "chart-axis-label")
        .attr("fill", "black")
        .attr("text-anchor", "middle")
        .attr("transform", `translate(-50,${chartAxisYCenter(chart)}) rotate(-90)`);

    // Create the line
    const pathValueSPX = chart.chart.append("path")
        .datum(datasetPreDotComBurst)
        .attr("id", "chart-line-spx")
        .attr("fill", "none")
        .attr("stroke", "steelblue")
        .attr("stroke-width", "1.5px")
        .attr("d", d3.line()
            .x((d, i) => x(dateParser(datasetPreDotComBurst[i].Date)))
            .y((d, i) => y(parseFloat(datasetPreDotComBurst[i].Close)))
        );

    // Perform the chart's entrance transition
    chart.chart.transition()
        .duration(sceneTransitionTime)
        .ease(d3.easeLinear)
        .attr("opacity", "1.0");

    // Perform the extended line's entrance transition
    const pathValueSPXLength = pathValueSPX.node().getTotalLength();

    pathValueSPX.attr("stroke-dashoffset", pathValueSPXLength)
        .attr("stroke-dasharray", pathValueSPXLength)
        .transition()
        .delay(sceneTransitionTime)
        .duration(chartTransitionTime * 2)
        .ease(d3.easeQuadOut)
        .attr("stroke-dashoffset", 0);
}

// Load scene 3
function loadScene3() {
    // Load the required dataset if it has not yet been loaded
    if(datasets.spxHistorical === undefined) {
        d3.csv("./data/spx-historical.csv")
            .then(dataset => {
                datasets.spxHistorical = dataset;
                renderScene3Canvas();
            });
    
    } else {
        renderScene3Canvas();
    }
}

// Render scene 3's visualization onto the canvas
function renderScene3Canvas() {
    // Get the loaded dataset
    const dataset = datasets.spxHistorical;

    // Declare the chart and its attributes
    const chart = charts.line;

    // Create the dataset subset
    const dateRangeEnd1 = new Date("2002-09-28");
    const dateRangeEnd2 = new Date("2007-07-07");
    const datasetDotComBurst = dataset.filter(d => (dateParser(d.Date) <= dateRangeEnd1));
    const dataset2000sGrowthPeriod = dataset.filter(d => ((dateParser(d.Date) >= dateRangeEnd1) && (dateParser(d.Date) <= dateRangeEnd2)));
    const datasetPreGreatRecession = dataset.filter(d => (dateParser(d.Date) <= dateRangeEnd2));

    // Create the x scale
    const x = d3.scaleTime()
        .domain(d3.extent(datasetPreGreatRecession, d => dateParser(d.Date)))
        .range([chart.marginLeft, (chart.width - chart.marginRight)]);

    // Create the y scale
    const y = d3.scaleLinear()
        .domain([600, 1600])
        .range([(chart.height - chart.marginBottom), chart.marginTop]);

    // Create the x axis
    chart.chart.select("#chart-axis-x")
        .transition()
        .duration(chartTransitionTime)
        .ease(d3.easeCubic)
        .call(d3.axisBottom(x))

    // Perform the line compression transition
    chart.chart.select("#chart-line-spx")
        // If the previous slide was still performing a line transition, interrupt it and snap-complete it
        .interrupt()
        .attr("stroke-dashoffset", 0)
        // Perform the line compression transition
        .transition()
        .duration(chartTransitionTime)
        .ease(d3.easeCubic)
        .attr("d", d3.line()
            .x((d, i) => x(dateParser(datasetDotComBurst[i].Date)))
            .y((d, i) => y(parseFloat(datasetDotComBurst[i].Close)))
        );

    // Create the extended line
    const pathValueSPX = chart.chart.append("path")
        .datum(dataset2000sGrowthPeriod)
        .attr("id", "chart-line-spx-2")
        .attr("fill", "none")
        .attr("stroke", "steelblue")
        .attr("stroke-width", "1.5px")
        .attr("d", d3.line()
            .x((d, i) => x(dateParser(dataset2000sGrowthPeriod[i].Date)))
            .y((d, i) => y(parseFloat(dataset2000sGrowthPeriod[i].Close)))
        );

    // Perform the extended line's entrance transition
    const pathValueSPXLength = pathValueSPX.node().getTotalLength();

    pathValueSPX.attr("stroke-dashoffset", pathValueSPXLength)
        .attr("stroke-dasharray", pathValueSPXLength)
        .transition()
        .delay(chartTransitionTime)
        .duration(chartTransitionTime * 2)
        .ease(d3.easeQuadOut)
        .attr("stroke-dashoffset", 0);
}













// Load scene 4
function loadScene4() {
    // Load the required dataset if it has not yet been loaded
    if(datasets.spxHistorical === undefined) {
        d3.csv("./data/spx-historical.csv")
            .then(dataset => {
                datasets.spxHistorical = dataset;
                renderScene4Canvas();
            });
    
    } else {
        renderScene4Canvas();
    }
}

// Render scene 3's visualization onto the canvas
function renderScene4Canvas() {
    // Get the loaded dataset
    const dataset = datasets.spxHistorical;

    // Declare the chart and its attributes
    const chart = charts.line;

    // Create the dataset subset
    const dateRangeEnd1 = new Date("2002-09-28");
    const dateRangeEnd2 = new Date("2007-07-07");
    const dateRangeEnd3 = new Date("2009-02-28");
    const datasetDotComBurst = dataset.filter(d => (dateParser(d.Date) <= dateRangeEnd1));
    const dataset2000sGrowthPeriod = dataset.filter(d => ((dateParser(d.Date) >= dateRangeEnd1) && (dateParser(d.Date) <= dateRangeEnd2)));
    const datasetGreatRecession = dataset.filter(d => ((dateParser(d.Date) >= dateRangeEnd2) && (dateParser(d.Date) <= dateRangeEnd3)));
    const datasetPostGreatRecession = dataset.filter(d => (dateParser(d.Date) <= dateRangeEnd3));

    // Create the x scale
    const x = d3.scaleTime()
        .domain(d3.extent(datasetPostGreatRecession, d => dateParser(d.Date)))
        .range([chart.marginLeft, (chart.width - chart.marginRight)]);

    // Create the y scale
    const y = d3.scaleLinear()
        .domain([600, 1600])
        .range([(chart.height - chart.marginBottom), chart.marginTop]);

    // Create the x axis
    chart.chart.select("#chart-axis-x")
        .transition()
        .duration(chartTransitionTime)
        .ease(d3.easeCubic)
        .call(d3.axisBottom(x))

    // Perform the line compression transition
    chart.chart.select("#chart-line-spx")
        // If the previous slide was still performing a line transition, interrupt it and snap-complete it
        .interrupt()
        .attr("stroke-dashoffset", 0)
        // Perform the line compression transition
        .transition()
        .duration(chartTransitionTime)
        .ease(d3.easeCubic)
        .attr("d", d3.line()
            .x((d, i) => x(dateParser(datasetDotComBurst[i].Date)))
            .y((d, i) => y(parseFloat(datasetDotComBurst[i].Close)))
        );

    chart.chart.select("#chart-line-spx-2")
        // If the previous slide was still performing a line transition, interrupt it and snap-complete it
        .interrupt()
        .attr("stroke-dashoffset", 0)
        // Perform the line compression transition
        .transition()
        .duration(chartTransitionTime)
        .ease(d3.easeCubic)
        .attr("d", d3.line()
            .x((d, i) => x(dateParser(dataset2000sGrowthPeriod[i].Date)))
            .y((d, i) => y(parseFloat(dataset2000sGrowthPeriod[i].Close)))
        );

    // Create the extended line
    const pathValueSPX = chart.chart.append("path")
        .datum(datasetGreatRecession)
        .attr("id", "chart-line-spx-3")
        .attr("fill", "none")
        .attr("stroke", "steelblue")
        .attr("stroke-width", "1.5px")
        .attr("d", d3.line()
            .x((d, i) => x(dateParser(datasetGreatRecession[i].Date)))
            .y((d, i) => y(parseFloat(datasetGreatRecession[i].Close)))
        );

    // Perform the extended line's entrance transition
    const pathValueSPXLength = pathValueSPX.node().getTotalLength();

    pathValueSPX.attr("stroke-dashoffset", pathValueSPXLength)
        .attr("stroke-dasharray", pathValueSPXLength)
        .transition()
        .delay(chartTransitionTime)
        .duration(chartTransitionTime * 2)
        .ease(d3.easeQuadOut)
        .attr("stroke-dashoffset", 0);
}









// Load scene 4
function loadScene5() {
    // Load the required dataset if it has not yet been loaded
    if(datasets.spxHistorical === undefined) {
        d3.csv("./data/spx-historical.csv")
            .then(dataset => {
                datasets.spxHistorical = dataset;
                renderScene4Canvas();
            });
    
    } else {
        renderScene5Canvas();
    }
}

// Render scene 3's visualization onto the canvas
function renderScene5Canvas() {
    // Get the loaded dataset
    const dataset = datasets.spxHistorical;

    // Declare the chart and its attributes
    const chart = charts.line;

    // Create the dataset subset
    const dateRangeEnd1 = new Date("2002-09-28");
    const dateRangeEnd2 = new Date("2007-07-07");
    const dateRangeEnd3 = new Date("2009-02-28");
    const datasetDotComBurst = dataset.filter(d => (dateParser(d.Date) <= dateRangeEnd1));
    const dataset2000sGrowthPeriod = dataset.filter(d => ((dateParser(d.Date) >= dateRangeEnd1) && (dateParser(d.Date) <= dateRangeEnd2)));
    const datasetGreatRecession = dataset.filter(d => ((dateParser(d.Date) >= dateRangeEnd2) && (dateParser(d.Date) <= dateRangeEnd3)));
    const datasetEnd = dataset.filter(d => (dateParser(d.Date) >= dateRangeEnd3));

    // Create the x scale
    const x = d3.scaleTime()
        .domain(d3.extent(dataset, d => dateParser(d.Date)))
        .range([chart.marginLeft, (chart.width - chart.marginRight)]);

    // Create the y scale
    const y = d3.scaleLinear()
        .domain([600, 4600])
        .range([(chart.height - chart.marginBottom), chart.marginTop]);

    // Create the x axis
    chart.chart.select("#chart-axis-x")
        .transition()
        .duration(chartTransitionTime)
        .ease(d3.easeCubic)
        .call(d3.axisBottom(x))

    // Perform the line compression transition
    chart.chart.select("#chart-line-spx")
        // If the previous slide was still performing a line transition, interrupt it and snap-complete it
        .interrupt()
        .attr("stroke-dashoffset", 0)
        // Perform the line compression transition
        .transition()
        .duration(chartTransitionTime)
        .ease(d3.easeCubic)
        .attr("d", d3.line()
            .x((d, i) => x(dateParser(datasetDotComBurst[i].Date)))
            .y((d, i) => y(parseFloat(datasetDotComBurst[i].Close)))
        );

    chart.chart.select("#chart-line-spx-2")
        // If the previous slide was still performing a line transition, interrupt it and snap-complete it
        .interrupt()
        .attr("stroke-dashoffset", 0)
        // Perform the line compression transition
        .transition()
        .duration(chartTransitionTime)
        .ease(d3.easeCubic)
        .attr("d", d3.line()
            .x((d, i) => x(dateParser(dataset2000sGrowthPeriod[i].Date)))
            .y((d, i) => y(parseFloat(dataset2000sGrowthPeriod[i].Close)))
        );

    chart.chart.select("#chart-line-spx-3")
        // If the previous slide was still performing a line transition, interrupt it and snap-complete it
        .interrupt()
        .attr("stroke-dashoffset", 0)
        // Perform the line compression transition
        .transition()
        .duration(chartTransitionTime)
        .ease(d3.easeCubic)
        .attr("d", d3.line()
            .x((d, i) => x(dateParser(datasetGreatRecession[i].Date)))
            .y((d, i) => y(parseFloat(datasetGreatRecession[i].Close)))
        );

    // Create the extended line
    const pathValueSPX = chart.chart.append("path")
        .datum(datasetEnd)
        .attr("id", "chart-line-spx-4")
        .attr("fill", "none")
        .attr("stroke", "steelblue")
        .attr("stroke-width", "1.5px")
        .attr("d", d3.line()
            .x((d, i) => x(dateParser(datasetEnd[i].Date)))
            .y((d, i) => y(parseFloat(datasetEnd[i].Close)))
        );

    // Perform the extended line's entrance transition
    const pathValueSPXLength = pathValueSPX.node().getTotalLength();

    pathValueSPX.attr("stroke-dashoffset", pathValueSPXLength)
        .attr("stroke-dasharray", pathValueSPXLength)
        .transition()
        .delay(chartTransitionTime)
        .duration(chartTransitionTime * 2)
        .ease(d3.easeQuadOut)
        .attr("stroke-dashoffset", 0);
}











// Load scene 0 onto the canvas
function loadScene0() {
    // Initialize the small sample data set
    const jokeDataDates = ["Two Days Ago", "Yesterday", "Today", "Tomorrow", "Two Days From Now"];
    const jokeDataValues = [0.0, 30.0, 37.0, 60.0, 100.0];

    // Declare the chart and its attributes
    const chart = {
        chart : null,
        width : canvasWidth,
        height : canvasHeight,
        x : 0,
        y : 0,
        marginBottom : 50,
        marginLeft : 80,
        marginRight : 20,
        marginTop : 50
    };

    // Create the chart (initially invisible)
    chart.chart = canvas.append("g")
        .attr("height", chart.height)
        .attr("width", chart.width)
        .attr("transform", `translate(${chart.x},${chart.y})`)
        .attr("opacity", "0.0");

    // Create the chart title
    chart.chart.append("text")
        .text("Unrealistic Expectations of Returns")
        .attr("class", "chart-title")
        .attr("text-anchor", "middle")
        .attr("transform", `translate(${chartTitleCenter(chart)},30)`);

    // Create the x scale
    const x = d3.scaleBand()
        .domain(jokeDataDates)
        .range([chart.marginLeft, (chart.width - chart.marginRight)]);

    // Create the y scale
    const y = d3.scaleLinear()
        .domain([0, 100])
        .range([(chart.height - chart.marginBottom), chart.marginTop]);

    // Create the x axis
    chart.chart.append("g")
        .attr("transform", `translate(0,${chart.height - chart.marginBottom})`)
        .call(d3.axisBottom(x))
        // Create the axis label
        .append("text")
        .text("Date")
        .attr("class", "chart-axis-label")
        .attr("fill", "black")
        .attr("text-anchor", "middle")
        .attr("transform", `translate(${chartAxisXCenter(chart)},35)`);

    // Create the y axis
    chart.chart.append("g")
        .attr("transform", `translate(${chart.marginLeft},0)`)
        .call(d3.axisLeft(y).tickFormat(d3.format(",.0%")))
        // Create the axis label
        .append("text")
        .text("Change in Value")
        .attr("class", "chart-axis-label")
        .attr("fill", "black")
        .attr("text-anchor", "middle")
        .attr("transform", `translate(-60,${chartAxisYCenter(chart)}) rotate(-90)`);

    // Create the line
    const jokeDataPath = chart.chart.append("path")
        .datum(jokeDataValues)
        .attr("fill", "none")
        .attr("stroke", "steelblue")
        .attr("stroke-width", "1.5px")
        .attr("d", d3.line()
            .x(function(d, i) { return x(jokeDataDates[i]) + (x.bandwidth() / 2); })
            .y(function(d) { return y(d); })
        );

    // Perform the chart's entrance transition
    chart.chart.transition()
        .duration(sceneTransitionTime)
        .ease(d3.easeLinear)
        .attr("opacity", "1.0");
    
    // Perform the line's entrance transition
    const jokeDataPathLength = jokeDataPath.node().getTotalLength();

    jokeDataPath.attr("stroke-dashoffset", jokeDataPathLength)
        .attr("stroke-dasharray", jokeDataPathLength)
        .transition()
        .delay(sceneTransitionTime)
        .duration(2500)
        .ease(d3.easeCubic)
        .attr("stroke-dashoffset", 0);
}

// Calculate the center point of a chart's x axis
function chartAxisXCenter(chart) {
    return (((chart.width - chart.marginLeft - chart.marginRight) / 2) + chart.marginLeft);
}

// Calculate the center point of a chart's y axis
function chartAxisYCenter(chart) {
    return (((chart.height - chart.marginTop - chart.marginBottom) / 2) + chart.marginTop);
}

// Calculate the center point of a chart's title
function chartTitleCenter(chart) {
    return (chart.width / 2);
}

// Calculate a deterministic, neighbor-distinct color given a position integer
function color(i) {
    return `hsl(${(((i * 139) + 210) % 360)}, 100%, 75%)`;
}