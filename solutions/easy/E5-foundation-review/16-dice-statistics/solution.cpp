#include <algorithm>
#include <iomanip>
#include <iostream>
int main() { int value, sum = 0, minimum = 7, maximum = 0; for (int i = 0; i < 5; ++i) { std::cin >> value; sum += value; minimum = std::min(minimum, value); maximum = std::max(maximum, value); } std::cout << std::fixed << std::setprecision(1) << "Sum: " << sum << "\nMin: " << minimum << "\nMax: " << maximum << "\nAverage: " << sum / 5.0 << "\n"; }
