import java.io.*;
import java.util.*;

/**
 * PS 44 - Traffic Signal Simulator
 * Concepts: Circular Queue, Graph, Priority Queue, Greedy, File Handling
 *
 * Compile: javac TrafficSignalSimulator.java
 * Run:     java TrafficSignalSimulator
 */
public class TrafficSignalSimulator {

    // ---------- 1. Circular Queue (array based) ----------
    static class CircularQueue<T> {
        private final Object[] data;
        private int front = 0, size = 0;

        CircularQueue(int capacity) { data = new Object[capacity]; }

        boolean isEmpty() { return size == 0; }
        int size() { return size; }

        void enqueue(T item) {
            if (size == data.length) throw new IllegalStateException("Queue full");
            data[(front + size) % data.length] = item;
            size++;
        }

        @SuppressWarnings("unchecked")
        T peek() { return isEmpty() ? null : (T) data[front]; }

        @SuppressWarnings("unchecked")
        T dequeue() {
            if (isEmpty()) return null;
            T item = (T) data[front];
            front = (front + 1) % data.length;
            size--;
            return item;
        }

        // move front item to the back -> next phase in the cycle
        void rotate() { if (size > 1) enqueue(dequeue()); }
    }

    // ---------- 2. Graph of roads ----------
    static class RoadGraph {
        private final Map<String, Set<String>> adj = new LinkedHashMap<>();

        void addRoad(String r) { adj.putIfAbsent(r, new LinkedHashSet<>()); }

        void connect(String a, String b) {
            addRoad(a); addRoad(b);
            adj.get(a).add(b);
            adj.get(b).add(a);
        }

        boolean hasRoad(String r) { return adj.containsKey(r); }
        Set<String> neighbours(String r) { return adj.getOrDefault(r, Collections.emptySet()); }
        Set<String> roads() { return adj.keySet(); }
    }

    // ---------- 3. Emergency request (Priority Queue + Greedy) ----------
    static class Emergency {
        final String road;
        final int priority;   // 3 = ambulance, 2 = fire, 1 = police
        final long seq;
        Emergency(String road, int priority, long seq) {
            this.road = road; this.priority = priority; this.seq = seq;
        }
    }

    // ---------- Simulator ----------
    private final CircularQueue<String> phases;
    private final RoadGraph graph = new RoadGraph();
    private final Map<String, String> signal = new LinkedHashMap<>();
    // Greedy rule: highest priority first, earlier arrival breaks ties
    private final PriorityQueue<Emergency> emergencies = new PriorityQueue<>(
            (a, b) -> a.priority != b.priority
                    ? Integer.compare(b.priority, a.priority)
                    : Long.compare(a.seq, b.seq));
    private long seqCounter = 0;
    private String current = null;
    private boolean started = false;
    private final boolean quiet;

    TrafficSignalSimulator(List<String> phaseList, boolean quiet) {
        this.quiet = quiet;
        phases = new CircularQueue<>(Math.max(1, phaseList.size()));
        for (String p : phaseList) {
            phases.enqueue(p);
            graph.addRoad(p);
            signal.put(p, "RED");
        }
        // adjacent roads in the cycle conflict with each other
        for (int i = 0; i < phaseList.size() && phaseList.size() > 1; i++) {
            graph.connect(phaseList.get(i), phaseList.get((i + 1) % phaseList.size()));
        }
    }

    private void out(String s) { System.out.println(s); }

    /** Feature: start */
    void start() {
        for (String r : signal.keySet()) signal.put(r, "RED");
        current = phases.peek();
        signal.put(current, "GREEN");
        started = true;
        out("Signal: " + current + " GREEN");
    }

    /** Feature: next phase (emergency has priority) */
    void nextPhase() {
        if (!started) { out("Simulator not started. Start it first."); return; }

        String target;
        if (!emergencies.isEmpty()) {
            Emergency e = emergencies.poll();
            target = e.road;
            if (target.equals(current)) {
                out("Emergency road " + target + " is already GREEN.");
                return;
            }
            out("Emergency vehicle on " + target + " (priority " + e.priority + ").");
        } else {
            if (phases.size() == 1) {
                out("Signal remains in the configured phase.");
                return;
            }
            // peek at the next phase without losing cycle order
            phases.rotate();
            target = phases.peek();
        }
        transitionTo(target);
    }

    /** Safe transition: current -> YELLOW -> RED, then target -> GREEN */
    private void transitionTo(String target) {
        signal.put(current, "YELLOW");
        out("Signal: " + current + " YELLOW");
        signal.put(current, "RED");
        out("Signal: " + current + " RED");

        // make sure all neighbours are RED (no conflicting greens)
        for (String n : graph.neighbours(target)) signal.put(n, "RED");

        // align circular queue so target is at the front
        int guard = phases.size();
        while (!phases.peek().equals(target) && guard-- > 0) phases.rotate();

        signal.put(target, "GREEN");
        current = target;
        out("Signal: " + current + " GREEN");
    }

    /** Feature: emergency request */
    void requestEmergency(String roadInput, int priority) {
        String road = canonical(roadInput);
        if (road == null) {
            out("Invalid road. Request ignored.");
            return;
        }
        emergencies.add(new Emergency(road, priority, seqCounter++));
        out("Emergency request accepted for " + road + ". Pending: " + emergencies.size());
    }

    /** Feature: status */
    void status() {
        out("---- STATUS ----");
        for (Map.Entry<String, String> e : signal.entrySet())
            out(String.format("%-8s %s", e.getKey(), e.getValue()));
        out("Pending emergencies: " + emergencies.size());
        // safety check
        int greens = 0;
        for (String s : signal.values()) if (s.equals("GREEN")) greens++;
        out(greens <= 1 ? "Safety check: OK (no conflicting greens)"
                        : "WARNING: conflicting greens!");
    }

    private String canonical(String in) {
        if (in == null) return null;
        for (String r : graph.roads()) if (r.equalsIgnoreCase(in.trim())) return r;
        return null;
    }

    // ---------- File handling ----------
    static final String FILE = "traffic_signals.txt";

    static void createDefaultFile() {
        try (PrintWriter w = new PrintWriter(new FileWriter(FILE))) {
            w.println("PHASES=North,East,South,West");
            w.println("CURRENT=North");
        } catch (IOException e) {
            System.out.println("Could not create " + FILE);
        }
    }

    static List<String> loadPhases() {
        File f = new File(FILE);
        if (!f.exists()) createDefaultFile();
        List<String> list = new ArrayList<>();
        try (BufferedReader br = new BufferedReader(new FileReader(FILE))) {
            String line;
            while ((line = br.readLine()) != null) {
                if (line.startsWith("PHASES=")) {
                    for (String p : line.substring(7).split(","))
                        if (!p.trim().isEmpty()) list.add(p.trim());
                }
            }
        } catch (IOException e) {
            System.out.println("Error reading " + FILE);
        }
        if (list.isEmpty()) list = Arrays.asList("North", "East", "South", "West");
        return list;
    }

    void saveState(List<String> phaseList) {
        try (PrintWriter w = new PrintWriter(new FileWriter(FILE))) {
            w.println("PHASES=" + String.join(",", phaseList));
            w.println("CURRENT=" + (current == null ? phaseList.get(0) : current));
            w.println("STATE_SAVED=true");
            out("State saved to " + FILE);
        } catch (IOException e) {
            out("Could not save state.");
        }
    }

    // ---------- Built-in test cases ----------
    static void runTests() {
        System.out.println("\n=== Test Case 1: Normal Input ===");
        TrafficSignalSimulator t1 = new TrafficSignalSimulator(
                Arrays.asList("North", "East", "South", "West"), true);
        t1.start();                                   // Signal: North GREEN

        System.out.println("\n=== Test Case 2: Boundary / Minimum Input ===");
        TrafficSignalSimulator t2 = new TrafficSignalSimulator(
                Collections.singletonList("North"), true);
        t2.start();
        t2.nextPhase();                               // remains in configured phase

        System.out.println("\n=== Test Case 3: Invalid Input ===");
        TrafficSignalSimulator t3 = new TrafficSignalSimulator(
                Arrays.asList("North", "East", "South", "West"), true);
        t3.start();
        t3.requestEmergency("Z", 3);                  // Invalid road. Request ignored.

        System.out.println("\n=== Test Case 4: Different Valid Scenario ===");
        TrafficSignalSimulator t4 = new TrafficSignalSimulator(
                Arrays.asList("North", "East", "South", "West"), true);
        t4.start();                                   // North green
        t4.requestEmergency("South", 3);
        t4.nextPhase();                               // safe transition, South priority
        System.out.println("-> South receives priority.");
        System.out.println();
    }

    // ---------- Main menu ----------
    public static void main(String[] args) {
        List<String> phaseList = loadPhases();
        TrafficSignalSimulator sim = new TrafficSignalSimulator(phaseList, false);
        Scanner sc = new Scanner(System.in);

        System.out.println("=== TRAFFIC SIGNAL SIMULATOR ===");
        System.out.println("Loaded phases from " + FILE + ": " + phaseList);

        while (true) {
            System.out.println("\n1. Start simulator");
            System.out.println("2. Next phase");
            System.out.println("3. Emergency request");
            System.out.println("4. Show status");
            System.out.println("5. Run test cases");
            System.out.println("6. Save & exit");
            System.out.print("Choice: ");
            String choice = sc.hasNextLine() ? sc.nextLine().trim() : "6";

            switch (choice) {
                case "1": sim.start(); break;
                case "2": sim.nextPhase(); break;
                case "3":
                    System.out.print("Road name: ");
                    String road = sc.nextLine();
                    System.out.print("Type (1=Police, 2=Fire, 3=Ambulance): ");
                    int pr = 1;
                    try { pr = Integer.parseInt(sc.nextLine().trim()); }
                    catch (NumberFormatException e) { System.out.println("Defaulting to priority 1."); }
                    if (pr < 1 || pr > 3) pr = 1;
                    sim.requestEmergency(road, pr);
                    break;
                case "4": sim.status(); break;
                case "5": runTests(); break;
                case "6":
                    sim.saveState(phaseList);
                    System.out.println("Goodbye!");
                    return;
                default: System.out.println("Invalid choice.");
            }
        }
    }
}