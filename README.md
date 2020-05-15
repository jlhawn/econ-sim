# Economics & Land Use Simulation

My naive economics and land use simulator.

[See Demo](https://jlhawn.github.io/econ-sim/)

## Notes

This isn't anywhere near done yet. All I've managed to complete so far is the map
rendering. It is a tessellated hex grid with a radius of 128 tiles containing a
total of 49,537 tiles. If each tile represents 1000 square meters then the entire
grid is roughly 50 square kilometers.

#### econ simulator

This simulation should provide a means for agents to meet basic needs (food,
shelter, etc) while maximizing hapiness through the subjective value of their own
consumption and leisure activities.

basic needs (per week?):
- food: 20 (meals)
- shelter: 50 (square meters?)
- clothing: 5 (sets of clothes?)

Each simulated person will have their own unique utility functions for various
goods which they would like to consume, along with skills in various forms of
production which would increase the value of their labor if employed in producing
that good or service.

**Goal**: *Demonstrate how location plays a vital role as different sites will
yield different natural resources and persons and firms will want to locate in
close proximity to others to minimize distribution costs.* The "player" should
have the ability to implement basic monetary and fiscal policies for the
simulated economy with the goal of maximizing both social equity and economic
prosperity.

#### Production of Goods and Services 

food:
- parcels which produce unprocessed foods:
  - farm:
    - yields a certain quantity of unprocessed food depending on a parcel's
      soil quality
    - soil quality diminishes over time but can be improved with use of
      fertilizer. Ceiling of soil quality is 2x base value. Each use of
      fertilizer only gets, say, 5% closer to that theoretical max quality
        - ex: fertilizer can be used to increase from 100% to 105% of may
          but an additional unit of fertilizer will only increase by 5% of
          the difference to 200% (5% of 95%) so that the new quality would
          be 109.75%, then 114.263%, then 118.549%, etc. It would take 10
          units of fertilizer to go from 100% to 140%. 20 to go to 164%
    - also produces bio-waste
  - pasture:
    - yields a certain quantity of livestock depending on parcel's pasture
      quality but at a significantly lower rate than farming
    - pasture quality can be increased with farm produce
    - probably best to use a logistic function to model this. The pasture
      has a max carrying capacity and output is based on current livestock
      population
    - also produces bio-waste
- unprocessed food must be sold/transported to a food processing plant
  - produce procesing:
    - bulk processing and packaging of produce is for distribution to
      grocers or restaurants
  - livestock processing:
    - pasture-raised livestock are stunned, eviscerated, and butchered into
      meat cuts for distribution to grocers or restaurants
- processed food must be sold/transported to a grocer or restaurant
  - grocer:
    - food purchased at a grocer may be bought in bulk and stored in an agent's
      residence but expires after 4 weeks
    - higher tiers of food provide a leisure bonus but may cost more
  - restaurant:
    - consuming food at a restaurant provides an even larger leisure bonus
      compared to buying food from a grocer but may cost even more
buildings:
- parcels which produce unprocessed construction material:
  - forestry:
    - yields a certain quantity of unprocessed logs depending on a parcel's
      forest quality. In the logging process, new trees are planted while
      young and medium aged trees are left for harvesting at a later date.
  - ore mine:
    - yields a certain quantity of unprocessed generic metal ore depending
      on a parcel's ore quality. Parcel ore quality reduces slowly over time.
  - stone quarry:
    - yields a certain quantity of unprocessed stone depending on a parcel's
      stone quality. Parcel stone quality reduces slowly over time.
- unprocessed construction material must be sold/transorted to a material
  processing plant
  - sawmill:
    - processes logs into timber products for distribution to construction sites
  - smelter:
    - processes metal ore into metal products for distribution to construction sites
  - furnace:
    - processes stone into brick products for distribution to construction sites
- construction of new buildings is managed and operated by separate buildings
  - construction office
    - coordinates a firm's construction operations
  - construction site
    - removes and yields existing structure materials and gathers new construction
      materials to produce a building on a site
clothing:
- raw natural fiber is produced as a byproduct of farms, pastures, and logging operations
- yarn spinning:
  - raw natural fiber is processed and spun into yarns
- textile finishing
  - yarn is processed by weaving or knitting into finished products


But this is all fixed/immovable capital! Each type requires its own specialized
moveable capital equipment and tools. To generalize this, there is a generic
kind of building called an "industrial assembly line" which manufactures these
various industrial goods. Different goods require different inputs and an
assembly line can be "retooled" to change its output but this action takes time
depending on how different the inputs are.


intermediate capital goods:
- mechanical parts:
  - metal or plastic is processed into two varieties of generic mechanical parts
- structural parts:
  - metal or plastic is processed into two varieties of generic structural parts
- electrical parts:
  - metal and plastic are processed into generic elecrtical parts

these generic mechanical, structural, and electrical parts are combined into final
industrial products

plastic:
- intermediate products introduced the need for plastic
- biochemical plant is a new type of building which processes any organic material
  into either fertilizer, or plastic
fertilizer:
  - used by farms to improve soil quality (no higher than double the base rate)

residences:
- constructed for private use by agents
- contains storage space for food and personal items
  - personal items increase value of leisure time
  - size of residence limts number of personal items
- lower density residence buildings comes with yard
  - yard increases value of leisure time
  - density over 4 units have no yard
  - proximity to public pars increases value of leisure time
- density of N units increases construction cost exponentially = 1.05^((N-1)/5)
  - requires more building material and equipment to build taller
- increase in land value may necessitate increase in density

department store:
- sells clothing and other personal items
- categories of personal items:
  - clothing
  - interior equipment/decor (furniture, appliances, etc)
  - recreational equipment (sporting goods, etc)
  - personal entertainment (books, board games, etc)

interior designs factory:
- manufactures furniture, householf appliances, etc
- combines yarns and mechanical, structural, or electrical parts

recreational equipment factory:
- manufactures sporting good, etc
- combines yarns and structural or electrical parts

entertainment device factory:
- manufactures books, board games, etc
- combines mechanical, and electrical parts

leisure destinations:
- requires studios
- types of leisure destinations
  - theater
  - gallery 

recycling:
- all items suffer depreciation
- each item can be broken down again into its original
  ingredients, recursively, back down to base inputs


on equipment:
- equipment isn't *necessary*, it simply increases the efficiency of labor
  or resources by reducing the amount of it required to produce an output.
  significant but diminishing returns. ex: we'll say each piece of equipment
  increases the output by 5%
- a firm may either use equipment to increase output with the same amount of
  labor/resources or maintain the same output with less labor/resources.
- if you previously produced 1000 product with 100 units of labor, a new
  piece of equipment would allow you to produce 1050 with the same 100 units
  of labor OR the same 1000 product with only 95.2 labor
- types of equipment:
  - labor saving equipment
    - makes more efficient use of labor by reducing the amount of labor
      required to produce an output
  - resource saving equipment
    - makes more efficient use of resources by reducing the amount of
      resources required to produce an output
    - this savings is realized in reduced waste resources in production
      - ex: a product requires 10 units of input resource A to produce
        1 unit of output B along with 3 units of waste output A:
          10A --> 1B + 3A
        Resource saving equipment may change this formula to reduce waste
        of A:
          9A --> 1B + 2A
        The theoretical best would be:
          7A --> 1B
    - Could be done stochastically, with the theoretical best formula
      always used and a changing probability that some input material
      is wasted, starting at 100% and going to zero the more resource
      saving equipment is used.

product durability:
- every product has a varying durability. On one end are relatively non-durable
  goods such as food and clothing lasting from weeks to a few years, while on the
  other end are durable goods like industrial equipment and consumer electronic
  devices, lasting several years to a decade. Buildings are an ultra-durable good,
  lasting multiple decades.

on distribution:
- the general rule will be that the seller of an item pays to get it to the
  purchaser, either way the cost is included in the price of the items sold.
- price must factor in cost of seller's labor and distance to destination.
  - could firms purchase equipment which increases delivery speed?
  - could government pay for upgrades along certain paths?
- the exception is that a resident pays (with their own time and subjective
  utility) to get to their place of employment, to go shopping, get food, and
  other activities.

labor proficiency:
- each worker is capable of taking a job in any field but each weak they
  gain some proficiency in that task which makes them more efficient at
  converting inputs into outputs. This should have diminishing returns with
  a theoretical max proficiency. A laborer cannot be, for example, 100x better
  at something than their base proficiency level. A 3x of base is perhaps a
  good max. If going from 1x to 2x takes 10 years, going to 2.5x should take
  another 10 years, 2.75x another 10 years, 2.875 another 10 years, etc.
  - incrementally, determine their difference from maximum and reduce it by
    some constant percentage each week.

professional services:
- another way to increase productivity is to reduce the number of material
  inputs required per output, i.e., more efficient use of inputs. This should
  also have some theoretical maximum above the base rate of efficiency, say,
  no more than 20% in savings. One thing to note here is that this has a
  multiplying benefit at each stage of production: not only could you make
  the same amount of some end product for up to 20% less in material costs,
  but you could also use 20% less of the materials which go into those
  materials. ex: if some object A originally requires 10 units of material
  B which in turn each required 10 units of material C (for a total of 100
  units of material C), professional services could reduce it to only 8
  units of material B (and therefore 80 units of material C) but then one
  could optimize material B as well to only require 8 units of C each for
  at total of only 64 units of C instead of the original 100.
- thinking about 2nd order effects of this, suppliers would be forced to
  either lower prices and reduce wages or cut production and jobs. using
  professional services themselves would not be enough - on its own - to
  keep their price competetive with the client just using it themselves
  because it does nothing to reduce the supplier's labor costs.
  on the other hand, this allows for the client to buy even more of this
  product to produce even more

banking:
- a single central bank (to simplify things)
- every agent in the game has an account (residents and businesses)
- transfers from one account to another can happen instantly
- loans issued to an agent result in a deposit to their account
  - begins as an equal asset and liability but the asset grows with
    a weekly interest rate 
  - borrower makes weekly payments to cover interest (which the bank
    realizes as income) and pay down principal
  - interest earned is divided between reserves and deposit accounts
    proportionally


Types of buildings (so far) and capital equipment:
  - farm
    - equipment:
      - farm equipment (optional)
    - input:
      - fertilizer (optional)
    - output:
      - raw farm produce
      - organic waste
  - pasture
    - equipment:
      - farm equipment (optional)
    - input:
      - raw farm produce (optional)
    - output:
      - livestock
      - organic waste
  - farm produce processor (mill, grainery, etc)
    - equipment:
      - produce processing equipment (optional)
    - input:
      - raw farm produce
    - output:
      - packaged processed produce
      - natural fibers
  - livestock processor (slaughterhouse, butcher, etc)
    - equipment:
      - animal processing equipment (optional)
    - input:
      - livestock
    - output:
      - packaged processed meat
      - natural fibers
  - grocery store
    - equipment:
      - food storage equipment (optional)
    - input:
      - packaged processed produce
      - processed/packed meats
    - output:
      - consumer produce or meat
  - restaurant
    - restaurant supplies
    - food
    - equipment:
    - input:
    - output:
  - timberland
    - timber harvesting equipment
    - equipment:
    - input:
    - output:
  - mine
    - mining equipment
    - equipment:
    - input:
    - output:
  - quarry
    - mining equipment
    - equipment:
    - input:
    - output:
  - sawmill
    - timber processing equipment
    - equipment:
    - input:
    - output:
  - smelter
    - smelting equipment
    - equipment:
    - input:
    - output:
  - furnace
    - industrial kiln equipment
    - equipment:
    - input:
    - output:
  - construction management office
    - construction equipment
    - equipment:
    - input:
    - output:
  - construction site (any site in transitionary state)
    - construction materials
    - equipment:
    - input:
    - output:
  - fiber processing plant
    - yarn manufacturing equipment
    - equipment:
    - input:
    - output:
  - textile factory
    - textile working equipment
    - equipment:
    - input:
    - output:
  - industrial assembly line
    - industrial machining equipment
    - equipment:
    - input:
    - output:
  - biochemical plant
    - biochemical processing equipment
    - equipment:
    - input:
    - output:
  - residences (of varying density)
    - purchased goods:
      - food
      - clothing
      - interior equipment/decor
      - recreational equipment
      - personal entertainment goods
    - equipment:
    - input:
    - output:
  - department store
    - personal item storage equipment
    - unsold personal items:
      - clothing
      - interior equipment/decor
      - recreational equipment
      - personal entertainment goods
    - equipment:
    - input:
    - output:
  - interior design factory
    - industrial machining equipment
    - equipment:
    - input:
    - output:
  - recreational equipment factory
    - industrial machining equipment
    - equipment:
    - input:
    - output:
  - entertainment device factory
    - industrial machining equipment
    - equipment:
    - input:
    - output:
  - studio
    - equipment:
    - input:
    - output:
  - gallery
    - equipment:
    - input:
    - output:
  - theater
    - equipment:
    - input:
    - output:
  - recycling center
    - equipment:
    - input:
    - output:





  ==================







- hex grid
  - parcel may cover multiple hexagons
    - zero or businesses and/or residences per parcel
    - parcels may be separated by paths along hexagonal borders


- get employment
  - earn money to spend on:
    - residence
    - essential goods
- get residence
  - need to optimize for proximty to:
    - place of employment
    - grocery store to buy essential goods
    - public parks
      - increases value of leisure time
- get essential goods
  - the more disposable income a resident has, the more they will tend to spend on consumer goods
  - any spending above a certain threshold provides a bonus to the value of leisure time
- have leisure time remaining
  - value of leisure time decreases with quantity (diminishing returns)
    - based on personal leisure value discount rate
  - residence proximity to public park increases value of leisure time
    - resident gets their normal value of leisure time plus a separate outdoor recreation bonus time:
      - recreation_time = leisure_time - 2*travel_time
      - only if available leisure_time > 2*travel_time to park

- initial conditions:
  - 1 grocery store which employs between 10 and 50 people
  - 1 park
  - 4 businesses which employ between 10 and 50 people each, depending on demand
    - it is assumed that businesses supply goods to the grocery store or provide intermediate
      goods and services to each other
    - the amount of spending at all grocery stores is used as a proxy for this
        - in the future we may add a model for intermediate goods along with primary, secondary,
          and tertiary sectors of the economy
  - start with a population of 100 with 20 jobs from each of the 4 businesses and the grocery store
  - for each person in initial population
    - assign them a random initial job
    - select an optimal residence site for that person which is within their means
      - assume a residence at any location costs the same
      - consider distance to job site, grocery store, and nearest park
      - want a site which will maximize value to the person


- where does money come from?
  - a central bank supplies loans to residents and businesses with a 4% annual interest rate (0.077% per week)
    - interest goes to
  - provides businesses with money for facilities and supplies and to pay employees
  - provides residents with money to buy housing and consumer goods
