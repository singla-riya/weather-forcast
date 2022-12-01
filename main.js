const API_Key = "e10f8be2c7a9b01c9b9e627d9cb6a4a4";

const DAYS_OF_THE_WEEK = ["sun","mon","tue","wed","thu","fri","sat"];
let selectedCityText;
let selectedCity;
const getCitiesUsingGeolocation = async(searchText) => {
 const response = await fetch(`https://api.openweathermap.org/geo/1.0/direct?q=${searchText}&limit=5&appid=${API_Key}`);
 return response.json();
}
const getCurrentWeatherData = async({lat, lon, name: city })=>{
    const url = lat&& lon?`https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${API_Key}&units=metric`:`https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${API_Key}&units=metric`
    const response= await fetch(url);
    return response.json()
}

//hourly forcast api

const getHourlyForcast = async({ name: city }) =>{
 const response = await fetch(`https://api.openweathermap.org/data/2.5/forecast?q=${city}&appid=${API_Key}&units=metric`);
 const data = await response.json();
 return data.list.map(forcast=>{
  const {main:{temp, temp_max, temp_min}, dt, dt_txt, weather: [{description, icon}]} = forcast;
  return {temp, temp_max, temp_min, dt, dt_txt, description, icon}
 })
}

const formatTemperature = (temp) =>`${temp?.toFixed(1)}°`;

const createIconUrl = (icon) => `http://openweathermap.org/img/wn/${icon}@2x.png`


const loadCurrentForecast = ({ name, main: {temp, temp_max, temp_min}, weather: [{description}] }) =>{
  const currentForecastElement = document.querySelector("#current-forcast");
  currentForecastElement.querySelector(".city").textContent = name;
  currentForecastElement.querySelector(".temp").textContent = formatTemperature(temp);
  currentForecastElement.querySelector(".description").textContent = description;
  currentForecastElement.querySelector(".min-max-temp").textContent = `H: ${formatTemperature(temp_max)} L:${formatTemperature(temp_min)}`;

  // <h1>City name</h1>
  // <P class="temp">Temp</P>
  // <P class="description">Description</P>
  // <P class="min-max-temp">High Low</P>
}

const loadHourlyForcast = ({main:{temp: tempNow}, weather:[{icon: iconNow}]},hourlyForcast) =>{
  console.log(hourlyForcast);
 const timeFormatter = Intl.DateTimeFormat("en",{
  hour12:true, hour:"numeric"
  })
  let dataFor12Hours = hourlyForcast.slice(2, 14); //12 enteries
  const hourlyContainer = document.querySelector(".hourly-container")
  let innerHTMLString =`<article>
    <h3 class="time">Now</h3>
    <img class="icon" src ="${createIconUrl(iconNow)}"  />
    <p class="hourly-temp">${formatTemperature(tempNow)}</p>
</article>`;
  for(let {temp, icon, dt_txt} of dataFor12Hours){

    innerHTMLString +=`<article>
    <h3 class="time">${timeFormatter.format(new Date(dt_txt))}</h3>
    <img class="icon" src ="${createIconUrl(icon)}"  />
    <p class="hourly-temp">${formatTemperature(temp)}</p>
</article>`
  }
  hourlyContainer.innerHTML = innerHTMLString;
}

//five day forcast

const calculateDayWiseForcast = (hourlyForcast) =>{
  let dayWiseForcast = new Map();
  for(let forcast of hourlyForcast){
    const [date] = forcast.dt_txt.split(" ");
    const daysOfTheWeek = DAYS_OF_THE_WEEK[new Date(date).getDay()] 
    console.log(daysOfTheWeek);
    if(dayWiseForcast.has(daysOfTheWeek)){
      let forcastForTheDay = dayWiseForcast.get(daysOfTheWeek);
      forcastForTheDay.push(forcast);
      dayWiseForcast.set(daysOfTheWeek, forcastForTheDay);
    }else{
      dayWiseForcast.set(daysOfTheWeek, [forcast]);
    }
  }
  console.log(dayWiseForcast);
  for(let [key,value] of dayWiseForcast){
    let temp_min = Math.min(...Array.from(value, val => val.temp_min));
    let temp_max = Math.max(...Array.from(value, val => val.temp_max));

    dayWiseForcast.set(key, { temp_min, temp_max, icon: value.find(v => v.icon).icon})
  }
  console.log(dayWiseForcast);
  return dayWiseForcast;
}

const loadFiveDayforcast = ( hourlyForcast) => {
  console.log(hourlyForcast)
  const dayWiseForcast = calculateDayWiseForcast(hourlyForcast);
 const container = document.querySelector(".five-day-forcast-container");
 let dayWiseInfo = "";
 Array.from(dayWiseForcast).map(([day, {temp_max, temp_min, icon}],index) =>{

  if(index <5){
  dayWiseInfo += `<article class="day-wise-forcast">
  <h3 class="day">${index === 0? "today": day}</h3>
  <img class="icon" src="${createIconUrl(icon)}" alt="icon for the forcast">
  <p class="min-temp">${formatTemperature (temp_min)}</p>
  <p class="max-temp">${formatTemperature(temp_max)}</p>
</article>`;
  }
 });

 container.innerHTML = dayWiseInfo;
  
}

//feels-like and humidity

const loadFeelsLike = ({main: {feels_like}})=>{
  let container = document.querySelector("#feels-like");
  container.querySelector(".feels-like-temp").textContent = formatTemperature(feels_like);

}

const loadHumidity = ({main: {humidity}}) =>{
  let container = document.querySelector("#humidity");
  container.querySelector(".humidity-value").textContent = `${humidity}%`;

}

const loadData = async()=>{
  const currentWeather = await getCurrentWeatherData(selectedCity);
  loadCurrentForecast(currentWeather)
  const hourlyForcast = await getHourlyForcast(currentWeather);
 loadHourlyForcast(currentWeather, hourlyForcast)
 loadFiveDayforcast(hourlyForcast);
 loadFeelsLike(currentWeather);
 loadHumidity(currentWeather);
}

const loadForcastUsingGeolocation = () =>{
  navigator.geolocation.getCurrentPosition(({coords})=>{
    const {latitude:lat, longitude:lon} = coords;
    selectedCity = {lat,lon};
    loadData();
  }, error=> console.log(error))
}

function debounce(func){
  let timer;
  return(...args)=>{
    clearTimeout(timer); //clear existing timer
    //create a new time till the user is typing
    timer = setTimeout(() =>{
      console.log("debounce");
      func.apply(this, args)
    }, 500);
  }
}

const onSearchChange = async (event) =>{
  let{ value } = event.target;
  if(!value){
    selectedCity = null;
    selectedCityText = "";
  }
  if(value && (selectedCityText !== value)){
    const listOfCities = await getCitiesUsingGeolocation(value);
  let options = "";
  for(let {lat, lon, name, state, country} of listOfCities){
    options += `<option data-city-details ='${JSON.stringify({lat, lon, name})}' value="${name}, ${state}, ${country}"></option>`;
  }
  document.querySelector("#cities").innerHTML = options;
  console.log((listOfCities));
  }
}

const handleCitySelection = (event) =>{
  console.log("selection done");
  selectedCityText = event.target.value;
  let options = document.querySelectorAll("#cities > option");
  console.log(options);
  if(options?.length){
    let selectedOption = Array.from(options).find(opt => opt.value === selectedCityText);
    selectedCity = JSON.parse(selectedOption.getAttribute("data-city-details"));
    console.log({selectedCity});
    loadData();
  }
}

const debounceSearch = debounce((event)=> onSearchChange(event))

document.addEventListener("DOMContentLoaded", async ()=>{
loadForcastUsingGeolocation();
const searchInput = document.querySelector("#search");
searchInput.addEventListener("input",debounceSearch);
searchInput.addEventListener("change",handleCitySelection);
  

})
