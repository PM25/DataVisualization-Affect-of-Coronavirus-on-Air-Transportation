window.onload = main;

function main() {
    var width = window.innerWidth,
        height = window.innerHeight;

    var svg = d3.select("svg");

    var projection = d3
        .geoMercator()
        .center([121, 24]) // 中心點(經緯度)
        .scale(200) // 放大倍率
        .translate([width / 3, height / 2.5]) // 置中
        .precision(0.1);
    var path = d3.geoPath().projection(projection);

    const zoom = d3.zoom().scaleExtent([0.6, 10]).on("zoom", zoomed);
    svg.call(zoom);

    function zoomed() {
        svg.selectAll("path") // To prevent stroke width from scaling
            .attr("transform", d3.event.transform);
    }

    var files = [
        "https://unpkg.com/world-atlas@1/world/50m.json",
        "data/flights.csv",
    ];

    var promises = [];
    files.forEach((url) => {
        let splited_url = url.split(".");
        if (splited_url[splited_url.length - 1] == "json") {
            promises.push(d3.json(url));
        } else if (splited_url[splited_url.length - 1] == "csv") {
            promises.push(d3.csv(url));
        }
    });

    taiwan_coords = [25.033, 121.5654];
    Promise.all(promises).then(function (values) {
        // Draw Map
        world = values[0];

        world = topojson.feature(world, world.objects.countries);

        svg.selectAll("path")
            .data(world.features)
            .enter()
            .append("path")
            .attr("class", "world")
            .attr("d", path);

        // Draw Boundary
        svg.append("path")
            .datum(world)
            .attr("d", path)
            .attr("class", "boundary");

        // Top 10 flight export countries
        flights_data = values[1];

        var links = [];
        for (let i = 0; i < 10; ++i) {
            let country = flights_data[i]["國家"];
            let coords = [
                parseFloat(flights_data[i]["經度"]),
                parseFloat(flights_data[i]["緯度"]),
            ];

            links.push({
                type: "LineString",
                country: country,
                coordinates: [taiwan_coords, coords],
            });
        }
    });
}
