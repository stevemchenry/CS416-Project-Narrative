"use strict"

import "https://d3js.org/d3.v7.min.js";

// Declare global variables and set static values
let canvas = null;
const canvasWidth = 1000;
const canvasHeight = 800;
const sceneTransitionTime = 500;
const chartTransitionTime = 2000;

// Execute the narrative visualization
init();

// Initialize the narrative visualization
function init() {
    // Select the canvas and store it in its global variable
    canvas = d3.select("#canvas");

    // Set the canvas's dimensions
    canvas.attr("width", canvasWidth)
        .attr("height", canvasHeight);

    // Start the narrative visualization by loading the first scene
    loadScene1();
}

// Load scene 1
function loadScene1() {
    // Load the story text

    // Load the visualization
    d3.csv("./data/popular-retail-equities-early-2023.csv")
        .then(renderScene1Canvas);
}

function renderScene1Canvas(dataset) {
    const data = dataset.map(a => a.RetailNetFlowMillions);

    // Declare the chart and its attributes
    const chart = {
        chart : null,
        width: canvasWidth,
        height: canvasHeight,
        x : (canvasWidth / 2),
        y : (canvasHeight / 2),
        innerRadius: 125,
        outerRadius: 200
    };

    // Create the pie and arc generators
    const pie = d3.pie();
    const arc = d3.arc()
        .innerRadius(chart.innerRadius)
        .outerRadius(chart.outerRadius);

    // Create the chart and set its dimensions and position
    chart.chart = canvas.append("g")
        .attr("height", chart.height)
        .attr("width", chart.width)
        .attr("transform", `translate(${chart.x},${chart.y})`);

    chart.chart.selectAll("path")
        .data(pie(data))
        .enter()
        .append("path")
        .attr("fill", (d, i) => color(i))
        .transition()
        .duration(chartTransitionTime)
        .attrTween("d", (d, i) => {
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

    chart.chart.selectAll("text")
        .data(pie(data))
        .enter()
        .append("text")
        .text((d, i) => dataset[i].Ticker)
        .style("text-anchor", "middle")
        .attr("transform", d => { console.log(arc.centroid(d)); return "translate(" + arc.centroid(d) + ")";})
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