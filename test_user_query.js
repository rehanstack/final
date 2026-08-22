import axios from 'axios';

async function run() {
    try {
        const res = await axios.post('http://localhost:5006/api/rag-query', {
            query: "what this data is?",
            chatHistory: []
        });
        console.log("Response text:");
        console.log(res.data?.answer || res.data?.response);
        if ((res.data?.answer || res.data?.response).includes("<think>")) {
            console.log("FAIL: <think> tags are still present!");
        } else {
            console.log("SUCCESS: <think> tags are stripped!");
        }
    } catch (e) {
        console.log("Error:", e.message);
    }
}
run();
