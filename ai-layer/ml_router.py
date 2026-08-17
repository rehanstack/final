from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
import pandas as pd
import numpy as np
import traceback

# ML Libraries
from sklearn.ensemble import RandomForestRegressor, RandomForestClassifier
from sklearn.preprocessing import LabelEncoder
from sklearn.metrics import mean_squared_error, r2_score, accuracy_score
from sklearn.cluster import KMeans
from sklearn.decomposition import PCA

router = APIRouter(prefix="/api/ml", tags=["Machine Learning"])

import re

def extract_number(val):
    if pd.isna(val):
        return np.nan
    if isinstance(val, (int, float)):
        return float(val)
    
    val_str = str(val).strip().upper()
    if not val_str:
        return np.nan
        
    multiplier = 1
    if val_str.endswith('K'):
        multiplier = 1000
        val_str = val_str[:-1]
    elif val_str.endswith('M') or val_str.endswith('MN'):
        multiplier = 1000000
        val_str = val_str[:-1] if val_str.endswith('M') else val_str[:-2]
    elif val_str.endswith('B') or val_str.endswith('BN'):
        multiplier = 1000000000
        val_str = val_str[:-1] if val_str.endswith('B') else val_str[:-2]
    elif val_str.endswith('L'):
        multiplier = 100000
        val_str = val_str[:-1]
    elif val_str.endswith('CR') or val_str.endswith('CRORE'):
        multiplier = 10000000
        val_str = val_str[:-2] if val_str.endswith('CR') else val_str[:-5]
        
    # Strip any remaining non-numeric chars except . and -
    val_str = re.sub(r'[^\d.-]', '', val_str)
    try:
        return float(val_str) * multiplier
    except ValueError:
        return np.nan

# --- Models ---

class ClusterRequest(BaseModel):
    data: List[Dict[str, Any]]
    feature_columns: List[str]
    n_clusters: int = 3

class SuggestionRequest(BaseModel):
    available_columns: List[str]
    table_name: str = "Dataset"

# --- Endpoints ---

@router.post("/cluster")
async def run_clustering(req: ClusterRequest):
    try:
        df = pd.DataFrame(req.data)
        features = req.feature_columns
        
        X = df[features].copy()
        
        # Preprocessing
        for col in X.columns:
            if X[col].dtype == 'object' or X[col].dtype.name == 'category':
                le = LabelEncoder()
                X[col] = X[col].fillna('Unknown').astype(str)
                X[col] = le.fit_transform(X[col])
            else:
                X[col] = X[col].fillna(X[col].median())
                
        # Clustering
        kmeans = KMeans(n_clusters=req.n_clusters, random_state=42, n_init='auto')
        clusters = kmeans.fit_predict(X)
        
        # Dimensionality Reduction for 2D Plotting
        pca = PCA(n_components=2)
        components = pca.fit_transform(X)
        
        plot_data = []
        for i in range(len(components)):
            item = {
                "x": float(components[i, 0]),
                "y": float(components[i, 1]),
                "cluster": int(clusters[i])
            }
            # Add original context
            for f in features:
                val = df.iloc[i][f]
                # Ensure JSON serializable
                if pd.isna(val):
                    val = None
                elif isinstance(val, (np.integer, int)):
                    val = int(val)
                elif isinstance(val, (np.floating, float)):
                    val = float(val)
                item[f] = val
                
            plot_data.append(item)
            
        # Cluster Summaries
        df['Cluster'] = clusters
        summaries = []
        for c in range(req.n_clusters):
            c_data = df[df['Cluster'] == c]
            summary = {"cluster": c, "count": int(len(c_data))}
            for f in features:
                if df[f].dtype in ['int64', 'float64']:
                    summary[f"{f}_avg"] = float(c_data[f].mean())
            summaries.append(summary)
            
        # Generate AI Profile for clusters
        try:
            import os
            from langchain_groq import ChatGroq
            from langchain_core.messages import HumanMessage
            import json
            import re

            api_key = os.environ.get("GROQ_API_KEY")
            if api_key:
                llm = ChatGroq(model="qwen/qwen3.6-27b", api_key=api_key, temperature=0.2)
                
                prompt = f"""You are an expert Data Scientist. I have clustered some data into {req.n_clusters} clusters using features: {features}.
Here are the average values for each cluster:
{json.dumps(summaries, indent=2)}

Please provide a short, catchy profile name and a 1-2 sentence description for each cluster summarizing what kind of data points belong there.
Respond ONLY with a valid JSON array of objects, strictly in this format:
[
  {{"cluster": 0, "name": "Premium Customers", "description": "High income and AOV with strong purchasing activity."}},
  ...
]
"""
                response = llm.invoke([HumanMessage(content=prompt)])
                
                content = response.content
                # Remove think block if present
                content = re.sub(r'<think>.*?</think>', '', content, flags=re.DOTALL)
                
                profiles = None
                
                # First try to match markdown code block
                json_match = re.search(r'```(?:json)?\s*(\[.*?\])\s*```', content, re.DOTALL)
                if json_match:
                    try:
                        profiles = json.loads(json_match.group(1))
                    except: pass
                
                # Fallback to general array match
                if not profiles:
                    json_match = re.search(r'\[\s*\{.*?\}\s*\]', content, re.DOTALL)
                    if json_match:
                        try:
                            profiles = json.loads(json_match.group(0))
                        except: pass
                        
                if profiles:
                    # Merge profiles into summaries
                    for s in summaries:
                        for p in profiles:
                            if p.get("cluster") == s["cluster"]:
                                s["profile_name"] = p.get("name", f"Cluster {s['cluster']}")
                                s["profile_description"] = p.get("description", "")
        except Exception as e:
            print(f"Failed to generate AI cluster profiles: {e}")
            
        return {
            "success": True,
            "plot_data": plot_data,
            "summaries": summaries
        }
        
    except Exception as e:
        error_msg = f"{str(e)}\n\nTraceback:\n{traceback.format_exc()}"
        print("ML Router Error (Cluster):", error_msg)
        raise HTTPException(status_code=500, detail=error_msg)

@router.post("/cluster-suggestions")
async def get_cluster_suggestions(req: SuggestionRequest):
    try:
        import os
        from langchain_groq import ChatGroq
        from langchain_core.messages import HumanMessage
        import json
        import re

        api_key = os.environ.get("GROQ_API_KEY")
        if not api_key:
            raise ValueError("GROQ_API_KEY is not configured.")

        llm = ChatGroq(model="qwen/qwen3.6-27b", api_key=api_key, temperature=0.3)
        
        prompt = f"""You are an expert Business Intelligence Analyst.
A user wants to cluster their dataset named '{req.table_name}'.
The dataset has the following numerical columns available for clustering:
{req.available_columns}

Please suggest 3 insightful ways to cluster this data for business intelligence (e.g. Customer Value Segmentation, Engagement Analysis, etc).
For each suggestion, provide:
- 'title': A catchy, professional title for the clustering strategy.
- 'description': A 1-sentence description of what this cluster analysis will reveal.
- 'features': A list of exactly 2 to 4 column names from the available list that should be used for this clustering. Do not invent columns.

Respond ONLY with a valid JSON array of objects, strictly in this format:
[
  {{
    "title": "Customer Value Segmentation",
    "description": "Groups users by their total spend and income to identify premium customers.",
    "features": ["Income", "Spend"]
  }}
]
"""
        response = llm.invoke([HumanMessage(content=prompt)])
        
        content = response.content
        # Remove think block if present
        content = re.sub(r'<think>.*?</think>', '', content, flags=re.DOTALL)
        
        suggestions = None
        # Try to match markdown code block
        json_match = re.search(r'```(?:json)?\s*(\[.*?\])\s*```', content, re.DOTALL)
        if json_match:
            try:
                suggestions = json.loads(json_match.group(1))
            except: pass
            
        # Fallback to general array match
        if not suggestions:
            json_match = re.search(r'\[\s*\{.*?\}\s*\]', content, re.DOTALL)
            if json_match:
                try:
                    suggestions = json.loads(json_match.group(0))
                except: pass
                
        if not suggestions:
            raise ValueError("Failed to parse LLM response into JSON.")
            
        return {
            "success": True,
            "suggestions": suggestions
        }
    except Exception as e:
        error_msg = f"{str(e)}"
        print("ML Router Error (Suggestions):", error_msg)
        raise HTTPException(status_code=500, detail=error_msg)
