import re

text = """<think> Here's a thinking process:
Analyze User Input: The user asks "what this data is?"
Identify Key Information from Context:
Schema Name: complex_movies_revenue_dataset
Columns: Movie_ID, Movie_Title, Release_Date, Release_Year, Genre, Studio, Director, Lead_Actor, Language, Country, Age_Rating, Runtime_Min, IMDb_Rating, IMDb_Votes, Theaters, Production_Budget_USD_M, Marketing_Budget_USD_M, Opening_Weekend_USD_M, Domestic_Box_Office_USD_M, International_Box_Office_USD_M, Total_Box_Office_USD_M, Streaming_Revenue_USD_M, TV_Rights_Revenue_USD_M, Digital_Sales_USD_M, Merchandise_Revenue_USD_M, Total_Revenue_USD_M, Total_Cost_USD_M, Net_Profit_USD_M, ROI_Percent, Distribution_Platform, Sequel.
Total records: 150
Synthesize Answer:
The data is a dataset named complex_movies_revenue_dataset.
It contains information about 150 movies.
It tracks various attributes including release details, cast/crew, ratings, box office performance (domestic, international, opening weekend), additional revenue streams (streaming, TV rights, digital sales, merchandise), costs (production, marketing), profitability metrics (net profit, ROI), and distribution info.
It's designed for analyzing movie financial performance and market success.
Draft Response (Mental Refinement): This dataset, named complex_movies_revenue_dataset, contains financial and performance data for 150 movies. It tracks key metrics such as release details, cast and crew, IMDb ratings, box office earnings (domestic, international, and opening weekend), additional revenue streams (streaming, TV rights, digital sales, merchandise), production and marketing costs, profitability (net profit and ROI), and distribution information. It's structured to support comprehensive analysis of movie performance, budgeting, and revenue generation across different platforms and markets.
Check against Constraints:
Concise? Yes.
Professional? Yes.
No hallucination? Strictly based on provided schema.
Answers the question? Yes.
Matches context? Yes. All good. Output matches draft.✅ </think>
This dataset, named complex_movies_revenue_dataset, contains comprehensive financial and performance data for 150 movies. It tracks:

Release & Creative Details: Title, release date/year, genre, studio, director, lead actor, language, country, age rating, runtime, and sequel status.
Audience Reception: IMDb rating and vote count.
Box Office Performance: Opening weekend, domestic, international, and total box office earnings, along with the number of theaters.
Additional Revenue Streams: Streaming, TV rights, digital sales, and merchandise revenue.
Financials & Profitability: Production and marketing budgets, total costs, total revenue, net profit, and ROI percentage.
Distribution: Primary distribution platform.
The dataset is structured to support detailed analysis of movie profitability, budget allocation, market performance, and revenue diversification across different platforms and regions. Let me know if you'd like insights on specific metrics or trends within the data."""

stripped = re.sub(r'<think>.*?</think>\s*', '', text, flags=re.DOTALL)
print("Stripped length:", len(stripped))
if "<think>" in stripped:
    print("FAILED TO STRIP")
else:
    print("STRIPPED SUCCESSFULLY")
