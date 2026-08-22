import axios from 'axios';

async function run() {
    const queries = [
        "hello",
        "what is this data about?",
        "which product is the most expensive?",
        "give me details of Pro Laptop"
    ];

    for (let i = 0; i < queries.length; i++) {
        try {
            console.log(`\n--- Test ${i+1}: ${queries[i]} ---`);
            const res = await axios.post('http://localhost:5005/api/rag-query', {
                query: queries[i],
                chatHistory: []
            });
            console.log("Success! Response length:", res.data?.answer?.length || res.data?.response?.length);
        } catch (e) {
            console.log("Error:", e.response?.data || e.message);
        }
    }
}
run();
