export type Population = number;

export interface Region {
    [region: string]: Population;
}

export interface RegionsByCountry {
    [country: string] : Region;
}

export const RegionPopulations: RegionsByCountry = {
    // From https://en.wikipedia.org/wiki/Population_of_Canada_by_province_and_territory
    //' April': 27,, 2020
    Canada: {
        Alberta: 4067175,
        "British Columbia": 4648055,
        Manitoba: 1278365,
        "New Brunswick": 747101,
        "Newfoundland and Labrador": 519716,
        "Northwest Territories": 41786,
        "Nova Scotia": 923598,
        Ontario: 13448494,
        "Prince Edward Island": 142907,
        Quebec: 8164361,
        Saskatchewan: 1098352,
        Yukon: 35874,
    },
    // From https://simple.wikipedia.org/wiki/List_of_U.S._states_by_population
    //' April': 27,, 2020
    US: {
         'California': 39512223,
         'Texas': 28995881,
         'Florida': 21477737,
         'New York': 19453561,
         'Pennsylvania': 12801989,
         'Illinois': 12671821,
         'Ohio': 11689100,
         'Georgia': 10617423,
         'North Carolina': 10488084,
         'Michigan': 9986857,
         'New Jersey': 8882190,
         'Virginia': 8535519,
         'Washington': 7614893,
         'Arizona': 7278717,
         'Massachusetts': 6949503,
         'Tennessee': 6833174,
         'Indiana': 6732219,
         'Missouri': 6137428,
         'Maryland': 6045680,
         'Wisconsin': 5822434,
         'Colorado': 5758736,
         'Minnesota': 5639632,
         'South Carolina': 5148714,
         'Alabama': 4903185,
         'Louisiana': 4648794,
         'Kentucky': 4467673,
         'Oregon': 4217737,
         'Oklahoma': 3956971,
         'Connecticut': 3565287,
         'Utah': 3205958,
         'Iowa': 3155070,
         'Puerto Rico': 3193694,
         'Nevada': 3080156,
         'Arkansas': 3017825,
         'Mississippi': 2976149,
         'Kansas': 2913314,
         'New Mexico': 2096829,
         'Nebraska': 1934408,
         'Idaho': 1787065,
         'West Virginia': 1792147,
         'Hawaii': 1415872,
         'New Hampshire': 1359711,
         'Maine': 1344212,
         'Montana': 1068778,
         'Rhode Island': 1059361,
         'Delaware': 973764,
         'South Dakota': 884659,
         'North Dakota': 762062,
         'Alaska': 731545,
         'District of Columbia': 705749,
         'Vermont': 623989,
         'Wyoming': 578759,
         'Guam': 165718,
         'U.S. Virgin Islands': 104914,
         'American Samoa': 55641,
         'Northern Mariana Islands': 55194,

    }
}
